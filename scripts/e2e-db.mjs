#!/usr/bin/env node
/**
 * Prepares the end-to-end database.
 *
 * The E2E suite runs against its OWN database (`aalmaram_e2e`) so a test run
 * never destroys development data. This script creates it if missing, applies
 * migrations and reseeds it. It runs as the first step of the Playwright
 * webServer command so the database is guaranteed to be ready before Next.js
 * accepts its first request.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// override:true because the Playwright webServer already exports the E2E
// DATABASE_URL; this script needs the base URL from .env to connect to an
// existing database and issue CREATE DATABASE.
config({ path: ".env", override: true, quiet: true });

const E2E_DATABASE = "aalmaram_e2e";

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.");
  process.exit(1);
}

export function e2eDatabaseUrl(base = baseUrl) {
  const url = new URL(base);
  url.pathname = `/${E2E_DATABASE}`;
  return url.toString();
}

const testUrl = e2eDatabaseUrl();

const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${E2E_DATABASE}"`);
  console.log(`[e2e] created database ${E2E_DATABASE}`);
} catch {
  console.log(`[e2e] database ${E2E_DATABASE} already exists`);
} finally {
  await admin.$disconnect();
}

const env = { ...process.env, DATABASE_URL: testUrl };

console.log("[e2e] applying migrations…");
execSync("npx prisma migrate deploy", { env, stdio: "inherit" });

console.log("[e2e] resetting data…");
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
try {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ActivityLog", "ChangeRequest", "Report", "ItineraryItem",
      "Itinerary", "Client", "Component", "Catalogue", "Module",
      "Vendor", "User"
    RESTART IDENTITY CASCADE
  `);
} finally {
  await prisma.$disconnect();
}

console.log("[e2e] seeding…");
execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
console.log(`[e2e] ready (${E2E_DATABASE})`);
