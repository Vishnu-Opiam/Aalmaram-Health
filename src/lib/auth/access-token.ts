import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Client portal invitation tokens.
 *
 * 32 bytes of CSPRNG entropy, transported once in the invitation link and never
 * stored in plain form. The database holds only the SHA-256 digest, so a
 * database read does not yield working access links.
 */
export const ACCESS_TOKEN_TTL_DAYS = 60;

export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function accessTokenExpiry(from: Date = new Date()): Date {
  const expiry = new Date(from);
  expiry.setUTCDate(expiry.getUTCDate() + ACCESS_TOKEN_TTL_DAYS);
  return expiry;
}

export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

export function buildInviteUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, "")}/trip/access/${token}`;
}
