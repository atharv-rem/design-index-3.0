import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  submitFeedback: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().min(1, "Name is required").transform(s => s.trim()),
      email: z.string().email("Invalid email address").transform(s => s.trim()),
      feedback: z.string().min(1, "Feedback is required").transform(s => s.trim()),
    }),
    handler: async (input) => {
      const { name, email, feedback } = input;

      const resendApiKey = import.meta.env.RESEND_API_KEY;
      const adminEmail = import.meta.env.ADMIN_EMAIL;

      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not configured in the server environment variables.");
      }
      if (!adminEmail) {
        throw new Error("ADMIN_EMAIL is not configured in the server environment variables.");
      }

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Design Index Feedback <onboarding@resend.dev>",
          to: adminEmail,
          subject: `New Feedback from: ${name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-top: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">New Feedback Submission</h2>
              <p style="margin: 16px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">You received a new feedback message from a visitor on Design Index.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; font-weight: 600; width: 140px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Name</td>
                  <td style="padding: 12px 0; color: #111827; font-size: 15px; font-weight: 500;">${name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; font-weight: 600; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Email</td>
                  <td style="padding: 12px 0; font-size: 15px;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: underline;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top;">Feedback</td>
                  <td style="padding: 12px 0; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${feedback}</td>
                </tr>
              </table>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        throw new Error(`Email service returned error: ${errorText}`);
      }

      return { success: true };
    },
  }),

  submitTool: defineAction({
    accept: 'form',
    input: z.object({
      toolName: z.string().min(1, "Tool name is required").transform(s => s.trim()),
      toolUrl: z.string().url("Invalid tool URL").transform(s => s.trim()),
      category: z.string().min(1, "Category is required").transform(s => s.trim()),
      email: z.string().email("Invalid email address").transform(s => s.trim()),
      reason: z.string().min(1, "Submission reason is required").transform(s => s.trim()),
    }),
    handler: async (input) => {
      const { toolName, toolUrl, category, email, reason } = input;

      const resendApiKey = import.meta.env.RESEND_API_KEY;
      const adminEmail = import.meta.env.ADMIN_EMAIL;

      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not configured in the server environment variables.");
      }
      if (!adminEmail) {
        throw new Error("ADMIN_EMAIL is not configured in the server environment variables.");
      }

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Design Index Submissions <onboarding@resend.dev>",
          to: adminEmail,
          subject: `New Tool Submission: ${toolName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-top: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">New Tool Submission</h2>
              <p style="margin: 16px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">A new design tool has been submitted for review on Design Index.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; font-weight: 600; width: 140px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Tool Name</td>
                  <td style="padding: 12px 0; color: #111827; font-size: 15px; font-weight: 500;">${toolName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; font-weight: 600; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Tool URL</td>
                  <td style="padding: 12px 0; font-size: 15px;"><a href="${toolUrl}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${toolUrl}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; font-weight: 600; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Category</td>
                  <td style="padding: 12px 0; color: #111827; font-size: 15px; text-transform: capitalize;">${category}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; font-weight: 600; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Submitter</td>
                  <td style="padding: 12px 0; font-size: 15px;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: underline;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top;">Why this tool?</td>
                  <td style="padding: 12px 0; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${reason}</td>
                </tr>
              </table>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        throw new Error(`Email service returned error: ${errorText}`);
      }

      return { success: true };
    },
  }),
};
