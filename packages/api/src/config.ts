import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Demo-only session secret — not for production. Documented in README. */
export const DEMO_SESSION_SECRET = process.env.SESSION_SECRET ?? "demo-session-secret-not-for-production";

export const DEMO_CREDENTIALS = {
  email: "demo@platform-ops.local",
  password: "demo-ops-console-2026",
  displayName: "Demo Operator",
} as const;

export const DB_PATH =
  process.env.SQLITE_PATH ?? path.join(__dirname, "..", "data", "ops-console.db");

export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_LIMIT = 25;
