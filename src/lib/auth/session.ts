import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env, isProduction } from "@/lib/env";

/**
 * Sessions are stateless signed JWTs held in httpOnly, SameSite=Lax cookies.
 *
 * Two entirely separate cookies exist so an admin session can never be mistaken
 * for a client session (or vice versa) by a coding error - the audiences differ
 * and verification rejects a mismatch.
 */
export const ADMIN_COOKIE = "aal_admin_session";
export const CLIENT_COOKIE = "aal_client_session";

const ISSUER = "aalmaram-health";
const ADMIN_AUDIENCE = "admin";
const CLIENT_AUDIENCE = "client-portal";

const ADMIN_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const CLIENT_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type AdminSession = { userId: string };
export type ClientSession = { clientId: string };

function secret() {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

async function sign(
  payload: Record<string, unknown>,
  audience: string,
  ttlSeconds: number,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret());
}

async function verify<T>(token: string, audience: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience,
    });
    return payload as T;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// --- admin -----------------------------------------------------------------

export async function createAdminSession(userId: string) {
  const token = await sign({ userId }, ADMIN_AUDIENCE, ADMIN_TTL_SECONDS);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions(ADMIN_TTL_SECONDS));
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<{ userId?: string }>(token, ADMIN_AUDIENCE);
  return payload?.userId ? { userId: payload.userId } : null;
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

// --- client portal ---------------------------------------------------------

export async function createClientSession(clientId: string) {
  const token = await sign({ clientId }, CLIENT_AUDIENCE, CLIENT_TTL_SECONDS);
  (await cookies()).set(CLIENT_COOKIE, token, cookieOptions(CLIENT_TTL_SECONDS));
}

export async function readClientSession(): Promise<ClientSession | null> {
  const token = (await cookies()).get(CLIENT_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<{ clientId?: string }>(token, CLIENT_AUDIENCE);
  return payload?.clientId ? { clientId: payload.clientId } : null;
}

export async function destroyClientSession() {
  (await cookies()).delete(CLIENT_COOKIE);
}
