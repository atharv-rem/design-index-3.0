/// <reference types="astro/client" />

import type { RequestLogger } from "evlog";

declare global {
  namespace App {
    interface Locals {
      /** Per-request wide event, created in src/middleware.ts and emitted once the response is built. */
      log: RequestLogger;
    }
  }
}
