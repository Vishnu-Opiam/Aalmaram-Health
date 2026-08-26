"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPasswordSafely } from "@/lib/auth/password";
import { createAdminSession, destroyAdminSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation/schemas";
import {
  errorState,
  parseForm,
  runAction,
  type FormState,
} from "@/lib/validation/form";
import { logger } from "@/lib/logger";

/** Best-effort client identifier for rate limiting. */
async function requestKey(suffix: string) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${ip}:${suffix}`;
}

/** Only same-origin relative paths are accepted, to prevent open redirects. */
function safeNext(next: string | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/") || next.startsWith("//")) return "/admin";
  return next;
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("login", formData, async () => {
    const input = parseForm(loginSchema, formData);

    // Two windows: a burst limit per IP, and a slower limit per account.
    enforceRateLimit(await requestKey("login"), 10, 5 * 60_000);
    enforceRateLimit(`account:${input.email}`, 5, 5 * 60_000);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, passwordHash: true, status: true },
    });

    const passwordOk = await verifyPasswordSafely(
      input.password,
      user?.passwordHash,
    );

    // A single generic message: the login form must not reveal whether an
    // account exists or is deactivated.
    if (!user || !passwordOk || user.status !== "ACTIVE") {
      logger.warn("failed admin login attempt");
      throw new AppError(
        "UNAUTHENTICATED",
        "That email and password combination is not recognised.",
      );
    }

    await createAdminSession(user.id);
    logger.info("admin signed in", { userId: user.id });
    return {
      status: "success",
      message: null,
      fieldErrors: {},
      redirectTo: safeNext(input.next),
    } satisfies FormState;
  });
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/login");
}

export { errorState };
