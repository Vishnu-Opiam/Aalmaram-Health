/**
 * Test bootstrap.
 *
 * Loads .env so DATABASE_URL and SESSION_SECRET are present, then pins
 * NODE_ENV=test. Integration tests run against the same local PostgreSQL
 * instance used for development (`npm run db:start`).
 */
import { config } from "dotenv";

config({ path: ".env", quiet: true });

process.env.SESSION_SECRET ??=
  "test-session-secret-that-is-definitely-long-enough-0123456789";
process.env.APP_URL ??= "http://localhost:3000";
process.env.EMAIL_TRANSPORT = "log";
