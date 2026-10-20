import { ActionError, type ActionAPIContext } from 'astro:actions';
import { z } from 'astro/zod';
import { incrementCounter } from '@/lib/cache';
import { note, warnOnce } from '@/lib/logger';

// Bot protection for the public forms: a Cloudflare Turnstile check (the widget is in
// src/components/form-captcha.astro), then a per-IP rate limit.
export const CAPTCHA_FIELD = 'cf-turnstile-response';

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export const spamFields = {
  [CAPTCHA_FIELD]: z.string().optional(),
};

type SpamInput = { [CAPTCHA_FIELD]?: string };

const clientIp = (context: ActionAPIContext): string => {
  try {
    return context.clientAddress;
  } catch {
    return context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  }
};

const verifyCaptcha = async (token: string | undefined, ip: string): Promise<boolean> => {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Let forms work in dev without keys; in production a missing key must not open the forms to bots.
    if (import.meta.env.DEV) {
      warnOnce('captcha-not-configured', 'captcha', 'TURNSTILE_SECRET_KEY is not set, so the captcha was skipped (dev only).');
      return true;
    }
    throw new Error('TURNSTILE_SECRET_KEY is not configured in the server environment variables.');
  }

  if (!token) {
    return false;
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
};

/** Throws an ActionError (shown on the form) when the captcha fails or the visitor sent too many forms. */
export const checkSpam = async (input: SpamInput, context: ActionAPIContext): Promise<void> => {
  const log = context.locals.log;
  const ip = clientIp(context);

  if (!(await verifyCaptcha(input[CAPTCHA_FIELD], ip))) {
    note('The captcha was missing or failed, so the submission was refused.');
    log.set({ spam: 'captcha failed' });
    throw new ActionError({
      code: 'FORBIDDEN',
      message: 'Please complete the captcha and try again.',
    });
  }

  const count = await incrementCounter(`design-index:ratelimit:forms:${ip}`, RATE_LIMIT_WINDOW_SECONDS);
  if (count !== null && count > RATE_LIMIT) {
    note('This visitor sent too many forms this hour, so the submission was refused.');
    log.set({ spam: 'rate limited' });
    throw new ActionError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many submissions. Please try again in an hour.',
    });
  }
};

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Makes user input safe to put inside the notification email's HTML. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** A URL field that only accepts http(s) links (z.string().url() also allows javascript: and others). */
export const httpUrl = (message: string) =>
  z
    .string()
    .trim()
    .url(message)
    .refine((value) => /^https?:\/\//i.test(value), message);
