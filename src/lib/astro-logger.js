import nodeLogger from "astro/logger/node";

// Astro's own logger, minus its "[200] /path 59ms" request lines.
// Every request already gets a fuller event from evlog (src/middleware.ts), so the extra line
// only duplicated it, with a different clock and duration. Everything else still prints.
//
// Astro colours the status code, so the message can start with an ANSI colour escape
// before the "[200]".
const REQUEST_LINE = /^(?:\x1b\[[0-9;]*m)*\[\d{3}\]/;

export default function astroLogger(config) {
  const destination = nodeLogger(config);

  return {
    ...destination,
    write(event) {
      if (event.label === null && REQUEST_LINE.test(event.message)) {
        return;
      }

      destination.write(event);
    },
  };
}
