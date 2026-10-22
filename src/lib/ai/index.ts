import "server-only";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { AiTask, Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * The only way the app talks to a model.
 *
 * - Provider "fake" (the default, and always in development and tests) runs
 *   the task's deterministic `fake` instead of a model, so everything works
 *   offline and predictably. "gateway" calls the Vercel AI Gateway through the
 *   AI SDK, with models from env (AI_MODEL_REASONING / AI_MODEL_FAST).
 * - Output is structured and validated by the task's Zod schema; one repair
 *   retry feeds the validation error back to the model.
 * - Every call records an AiRun. Prompts, transcripts and client text are never
 *   stored or logged: `logOutput` reduces the result to ids and counts.
 */
export type GenerateInput<T> = {
  task: AiTask;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  promptVersion: string;
  model: "reasoning" | "fast";
  /** Deterministic stand-in used by the fake provider (and as its fixture). */
  fake: () => T;
  /** Reduces the result to something safe to store: ids, counts, flags. */
  logOutput?: (data: T) => Prisma.InputJsonValue;
  entity?: { type: string; id: string };
  actorUserId?: string;
};

export type GenerateResult<T> = { data: T; runId: string; provider: "fake" | "gateway" };

export function aiProvider(): "fake" | "gateway" {
  return env().AI_PROVIDER;
}

export async function generateStructured<T>(input: GenerateInput<T>): Promise<GenerateResult<T>> {
  const provider = aiProvider();
  const model = provider === "fake" ? "fake" : input.model === "reasoning" ? env().AI_MODEL_REASONING : env().AI_MODEL_FAST;
  const started = Date.now();
  let attempts = 1;
  let usage: { inputTokens?: number; outputTokens?: number } = {};

  const record = (status: "SUCCEEDED" | "FAILED" | "INVALID_OUTPUT", data?: T, errorCode?: string) =>
    prisma.aiRun.create({
      data: {
        task: input.task,
        provider,
        model,
        promptVersion: input.promptVersion,
        status,
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        latencyMs: Date.now() - started,
        attempts,
        entityType: input.entity?.type ?? null,
        entityId: input.entity?.id ?? null,
        actorUserId: input.actorUserId ?? null,
        output: data !== undefined && input.logOutput ? input.logOutput(data) : undefined,
        errorCode: errorCode ?? null,
      },
      select: { id: true },
    });

  try {
    let data: T;
    if (provider === "fake") {
      // Validated like a model's output, so a broken fixture fails loudly in tests.
      data = input.schema.parse(input.fake());
    } else {
      const call = (prompt: string) =>
        generateText({ model, system: input.system, prompt, output: Output.object({ schema: input.schema }) });
      try {
        const result = await call(input.prompt);
        usage = result.usage;
        data = result.output as T;
      } catch (error) {
        if (!NoObjectGeneratedError.isInstance(error)) throw error;
        attempts = 2;
        const result = await call(
          `${input.prompt}\n\nYour previous answer did not match the required JSON schema (${error.cause instanceof Error ? error.cause.message.slice(0, 500) : "invalid output"}). Answer again with valid JSON only.`,
        );
        usage = result.usage;
        data = result.output as T;
      }
    }
    const run = await record("SUCCEEDED", data);
    return { data, runId: run.id, provider };
  } catch (error) {
    const invalid = NoObjectGeneratedError.isInstance(error) || (error as { name?: string })?.name === "ZodError";
    await record(invalid ? "INVALID_OUTPUT" : "FAILED", undefined, (error as { name?: string })?.name ?? "Error").catch(
      () => undefined,
    );
    logger.error("ai call failed", error, { task: input.task, provider });
    throw error;
  }
}
