#!/usr/bin/env node
/**
 * Local development database.
 *
 * The project targets PostgreSQL. This script boots a real PostgreSQL server
 * from the `embedded-postgres` package so a developer does not need Docker or a
 * system-wide Postgres install. It is a DEVELOPMENT convenience only - in
 * production DATABASE_URL points at a managed PostgreSQL instance and this
 * script is never used.
 *
 *   node scripts/pg.mjs start   # start (idempotent), create the app database
 *   node scripts/pg.mjs stop    # stop
 *   node scripts/pg.mjs status  # report whether the port is accepting connections
 */
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, ".pgdata");
const PID_FILE = path.join(ROOT, ".pgdata", ".running.json");

const PORT = Number(process.env.EMBEDDED_PG_PORT || 5433);
const USER = "aalmaram";
const PASSWORD = "aalmaram";
const DATABASE = "aalmaram";

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const done = (v) => {
      socket.destroy();
      resolve(v);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1500, () => done(false));
  });
}

async function waitForPort(port, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function loadEmbeddedPostgres() {
  const mod = await import("embedded-postgres");
  return mod.default ?? mod.EmbeddedPostgres ?? mod;
}

async function start() {
  if (await portOpen(PORT)) {
    console.log(`[db] PostgreSQL already accepting connections on port ${PORT}.`);
    printUrl();
    return;
  }

  const EmbeddedPostgres = await loadEmbeddedPostgres();
  const initialised = fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    onLog: () => {},
    onError: () => {},
  });

  if (!initialised) {
    console.log("[db] Initialising a new PostgreSQL cluster (first run downloads binaries)...");
    await pg.initialise();
  }

  console.log(`[db] Starting PostgreSQL on port ${PORT}...`);
  await pg.start();

  if (!(await waitForPort(PORT))) {
    throw new Error(`PostgreSQL did not start on port ${PORT}`);
  }

  try {
    await pg.createDatabase(DATABASE);
    console.log(`[db] Created database "${DATABASE}".`);
  } catch {
    console.log(`[db] Database "${DATABASE}" already exists.`);
  }

  fs.writeFileSync(PID_FILE, JSON.stringify({ port: PORT, startedAt: new Date().toISOString() }));
  console.log("[db] Ready.");
  printUrl();
  console.log("[db] Leave this process running. Ctrl+C to stop the server.");

  // The PostgreSQL server runs as a child of this process, so this process must
  // stay alive for the duration of the development session.
  const shutdown = async () => {
    console.log("\n[db] Shutting down...");
    try {
      await pg.stop();
    } catch {
      /* already gone */
    }
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  await new Promise(() => {});
}

async function stop() {
  const EmbeddedPostgres = await loadEmbeddedPostgres();
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    onLog: () => {},
    onError: () => {},
  });
  try {
    await pg.stop();
    console.log("[db] Stopped.");
  } catch (error) {
    console.log(`[db] Could not stop cleanly: ${error.message}`);
  }
  if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
  process.exit(0);
}

async function status() {
  const open = await portOpen(PORT);
  console.log(open ? `[db] Up on port ${PORT}.` : `[db] Down (port ${PORT} closed).`);
  process.exit(open ? 0 : 1);
}

function printUrl() {
  console.log(
    `[db] DATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}?schema=public"`,
  );
}

const command = process.argv[2] ?? "start";
const commands = { start, stop, status };
if (!commands[command]) {
  console.error(`Unknown command "${command}". Use start | stop | status.`);
  process.exit(1);
}
commands[command]().catch((error) => {
  console.error(`[db] ${error.stack || error.message}`);
  process.exit(1);
});
