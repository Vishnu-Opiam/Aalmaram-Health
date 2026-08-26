/**
 * Application error taxonomy.
 *
 * Every error carries a message that is safe to show a user. Technical detail
 * stays in `cause` and is only ever written to the server log.
 */
export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  /** Field-level messages, for form rendering. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { cause?: unknown; fieldErrors?: Record<string, string[]> },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.fieldErrors = options?.fieldErrors;
  }
}

export const unauthenticated = (m = "You need to sign in to continue.") =>
  new AppError("UNAUTHENTICATED", m);

export const forbidden = (m = "You do not have access to this resource.") =>
  new AppError("FORBIDDEN", m);

export const notFound = (what = "The requested record") =>
  new AppError("NOT_FOUND", `${what} could not be found.`);

export const conflict = (m: string) => new AppError("CONFLICT", m);

export const validation = (
  m: string,
  fieldErrors?: Record<string, string[]>,
) => new AppError("VALIDATION", m, { fieldErrors });

export const rateLimited = (
  m = "Too many attempts. Please wait a moment and try again.",
) => new AppError("RATE_LIMITED", m);

/**
 * Convert any thrown value into a message that is safe to display.
 * Unknown errors are deliberately generic - the detail is logged, not shown.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return "Something went wrong on our side. Please try again, or contact the Aalmaram team if it keeps happening.";
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
