import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

/**
 * End-to-end configuration.
 *
 * The golden-path test drives a real Next.js production build against a real
 * PostgreSQL database. Start the database first (`npm run db:start`);
 * Playwright then prepares a dedicated `aalmaram_e2e` database, builds the app
 * and starts the server itself.
 *
 * A separate database is used deliberately: the suite truncates and reseeds on
 * every run, and must never do that to development data.
 */
loadEnv({ path: ".env", quiet: true });

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

function e2eDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env before running the E2E suite.",
    );
  }
  const url = new URL(base);
  url.pathname = "/aalmaram_e2e";
  return url.toString();
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Database preparation is part of the command, so it is guaranteed to
        // finish before Next.js serves its first request.
        command: `node scripts/e2e-db.mjs && npm run build && npx next start -p ${PORT}`,
        url: `${BASE_URL}/login`,
        reuseExistingServer: false,
        timeout: 420_000,
        stdout: "pipe",
        env: {
          DATABASE_URL: e2eDatabaseUrl(),
          APP_URL: BASE_URL,
          EMAIL_TRANSPORT: "log",
          NODE_ENV: "production",
        },
      },
});
