/**
 * Minimal structured server logger.
 *
 * Privacy: this system holds health/wellness *interests*. Nothing that could be
 * read as health information is ever passed to the logger - callers log entity
 * ids and action names, never intake free text. `redact` is a defence in depth
 * for accidental object logging.
 */
type Level = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "passwordHash",
  "token",
  "accesstoken",
  "accessTokenHash",
  "sessionsecret",
  "healthinterests",
  "healthInterests",
  "wellnessinterests",
  "wellnessInterests",
  "culturalinterests",
  "culturalInterests",
  "intakenotes",
  "intakeNotes",
  "generalpreferences",
  "generalPreferences",
  "message",
  "content",
  "transcript",
  "summary",
  "prompt",
  "system",
  "musthaves",
  "avoid",
  "reply",
  "text",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[deep]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())
      ? "[redacted]"
      : redact(raw, depth + 1);
  }
  return out;
}

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  const line = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) } : {}),
  };
  const serialised = JSON.stringify(line);
  if (level === "error") console.error(serialised);
  else if (level === "warn") console.warn(serialised);
  else console.log(serialised);
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") emit("debug", m, c);
  },
  info: (m: string, c?: Record<string, unknown>) => emit("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit("warn", m, c),
  error: (m: string, error?: unknown, c?: Record<string, unknown>) =>
    emit("error", m, {
      ...c,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    }),
};
