import { z } from "zod";
import { AppError, isAppError, toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Shared shape returned by every Server Action that backs a form.
 * `useActionState` on the client renders from this and nothing else.
 */
export type FormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string[]>;
  /** Echoed back so a failed submit does not wipe what the user typed. */
  values?: Record<string, string>;
  /**
   * Where to go once the action has settled.
   *
   * Create actions do NOT call redirect() themselves. Redirecting from inside
   * an action that backs useActionState makes React commit a brand new tree
   * while the action transition is still resolving, and the two can deadlock -
   * the form sits on "Saving…" forever even though the write succeeded and the
   * server already served the destination. Returning the destination instead
   * lets the action settle first; the form then navigates via
   * useActionRedirect().
   */
  redirectTo?: string;
};

export const idleState: FormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

export function successState(
  message: string,
  redirectTo?: string,
): FormState {
  return { status: "success", message, fieldErrors: {}, redirectTo };
}

export function errorState(
  message: string,
  fieldErrors: Record<string, string[]> = {},
  values?: Record<string, string>,
): FormState {
  return { status: "error", message, fieldErrors, values };
}

export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Parse FormData with a Zod schema, raising an AppError on failure. */
export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): z.infer<T> {
  const raw = formDataToObject(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      fieldErrors,
    });
  }
  return parsed.data;
}

/**
 * Wraps a Server Action body so every failure becomes a renderable FormState
 * and technical detail is logged rather than shown.
 *
 * Note: `redirect()` throws a special Next.js error which must propagate, so it
 * is re-thrown untouched.
 */
export async function runAction(
  name: string,
  formData: FormData,
  body: () => Promise<FormState>,
): Promise<FormState> {
  try {
    return await body();
  } catch (error) {
    if (isNextControlFlow(error)) throw error;

    if (isAppError(error)) {
      if (error.code === "INTERNAL") {
        logger.error(`action:${name} failed`, error);
      } else {
        logger.warn(`action:${name} rejected`, { code: error.code });
      }
      return errorState(
        error.message,
        error.fieldErrors ?? {},
        formDataToObject(formData),
      );
    }

    if (isUniqueConstraintError(error)) {
      const target = uniqueConstraintTarget(error);
      return errorState(
        target
          ? `Another record already uses that ${target}. Please choose a different one.`
          : "Another record with these details already exists.",
        {},
        formDataToObject(formData),
      );
    }

    logger.error(`action:${name} threw`, error);
    return errorState(toUserMessage(error), {}, formDataToObject(formData));
  }
}

function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === "string" && /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK)/.test(digest);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function uniqueConstraintTarget(error: unknown): string | null {
  const target = (error as { meta?: { target?: unknown } })?.meta?.target;
  if (Array.isArray(target)) return target.join(" + ");
  if (typeof target === "string") return target;
  return null;
}
