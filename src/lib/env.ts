import { z } from "zod";

/**
 * Server-side environment configuration.
 *
 * Parsed once, eagerly, so a misconfigured deployment fails at boot with a
 * readable message rather than at the first request with a confusing one.
 * Never import this from a Client Component.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_TRANSPORT: z.enum(["log", "smtp"]).default("log"),
  EMAIL_FROM: z.string().default("Aalmaram Health <no-reply@aalmaram.example>"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // AI: "fake" (deterministic, offline) unless explicitly switched to the gateway.
  AI_PROVIDER: z.enum(["fake", "gateway"]).default("fake"),
  AI_GATEWAY_API_KEY: z.string().optional(),
  AI_MODEL_REASONING: z.string().default("anthropic/claude-sonnet-5.5"),
  AI_MODEL_FAST: z.string().default("anthropic/claude-haiku-5.5"),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";
