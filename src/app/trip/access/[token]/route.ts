import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashAccessToken } from "@/lib/auth/access-token";
import { createClientSession } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";

/**
 * Client portal entry point.
 *
 * The invitation token is exchanged for a session cookie and immediately
 * dropped from the URL by redirecting to /trip. That keeps the token out of
 * browser history, the Referer header and any server access log of later pages.
 *
 * The token is looked up by its hash - the raw value is never stored - and the
 * lookup is a unique-index hit, so there is no per-row comparison to time.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const origin = request.nextUrl.origin;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Brute-forcing a 256-bit token is infeasible, but the limiter keeps a
  // scripted attacker from generating load.
  const limit = consumeRateLimit(`portal-access:${ip}`, 20, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.redirect(`${origin}/trip/sign-in?error=rate_limited`);
  }

  if (!token || token.length < 20) {
    return NextResponse.redirect(`${origin}/trip/sign-in?error=invalid`);
  }

  const client = await prisma.client.findUnique({
    where: { accessTokenHash: hashAccessToken(token) },
    select: {
      id: true,
      status: true,
      accessTokenExpiresAt: true,
    },
  });

  if (!client) {
    logger.warn("portal access rejected: unknown token");
    return NextResponse.redirect(`${origin}/trip/sign-in?error=invalid`);
  }

  if (client.status === "ARCHIVED") {
    return NextResponse.redirect(`${origin}/trip/sign-in?error=inactive`);
  }

  if (
    client.accessTokenExpiresAt &&
    client.accessTokenExpiresAt.getTime() < Date.now()
  ) {
    return NextResponse.redirect(`${origin}/trip/sign-in?error=expired`);
  }

  await createClientSession(client.id);

  await prisma.client.update({
    where: { id: client.id },
    data: { lastPortalLoginAt: new Date() },
  });

  await logActivity({
    action: ACTIVITY_ACTIONS.CLIENT_PORTAL_SIGNED_IN,
    entityType: "Client",
    entityId: client.id,
    actorUserId: null,
    actorLabel: "Client",
  });

  return NextResponse.redirect(`${origin}/trip`);
}
