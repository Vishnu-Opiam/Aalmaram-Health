import { beforeEach, describe, expect, it } from "vitest";
import {
  accessTokenExpiry,
  buildInviteUrl,
  generateAccessToken,
  hashAccessToken,
  safeEqualHex,
} from "@/lib/auth/access-token";
import { hashPassword, verifyPassword, verifyPasswordSafely } from "@/lib/auth/password";
import {
  __resetRateLimits,
  consumeRateLimit,
  enforceRateLimit,
} from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

describe("client portal access tokens", () => {
  it("generates high-entropy, URL-safe tokens", () => {
    const token = generateAccessToken();
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never generates the same token twice", () => {
    const tokens = new Set(
      Array.from({ length: 200 }, () => generateAccessToken()),
    );
    expect(tokens.size).toBe(200);
  });

  it("hashes deterministically, and the hash does not reveal the token", () => {
    const token = generateAccessToken();
    const hash = hashAccessToken(token);
    expect(hashAccessToken(token)).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashAccessToken("a")).not.toBe(hashAccessToken("b"));
  });

  it("expires tokens 60 days out", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(accessTokenExpiry(from).toISOString()).toBe(
      "2026-03-02T00:00:00.000Z",
    );
  });

  it("compares hex digests safely and rejects mismatched lengths", () => {
    const a = hashAccessToken("token-a");
    expect(safeEqualHex(a, a)).toBe(true);
    expect(safeEqualHex(a, hashAccessToken("token-b"))).toBe(false);
    expect(safeEqualHex(a, "abcd")).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
  });

  it("builds an invite URL without a double slash", () => {
    expect(buildInviteUrl("http://localhost:3000/", "TOKEN")).toBe(
      "http://localhost:3000/trip/access/TOKEN",
    );
    expect(buildInviteUrl("http://localhost:3000", "TOKEN")).toBe(
      "http://localhost:3000/trip/access/TOKEN",
    );
  });
});

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("Aalmaram!Demo1");
    expect(await verifyPassword("Aalmaram!Demo1", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("returns false rather than throwing for an unknown account", async () => {
    expect(await verifyPasswordSafely("anything", null)).toBe(false);
    expect(await verifyPasswordSafely("anything", undefined)).toBe(false);
  });
});

describe("rate limiting", () => {
  beforeEach(() => {
    __resetRateLimits();
  });

  it("allows requests up to the limit and blocks beyond it", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(consumeRateLimit("key", 3, 60_000).allowed).toBe(true);
    }
    const blocked = consumeRateLimit("key", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("keeps separate buckets per key", () => {
    consumeRateLimit("a", 1, 60_000);
    expect(consumeRateLimit("a", 1, 60_000).allowed).toBe(false);
    expect(consumeRateLimit("b", 1, 60_000).allowed).toBe(true);
  });

  it("reports the remaining allowance", () => {
    expect(consumeRateLimit("k", 5, 60_000).remaining).toBe(4);
    expect(consumeRateLimit("k", 5, 60_000).remaining).toBe(3);
  });

  it("enforceRateLimit throws a RATE_LIMITED AppError once exhausted", () => {
    enforceRateLimit("throwing", 1, 60_000);
    try {
      enforceRateLimit("throwing", 1, 60_000);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("RATE_LIMITED");
      expect((error as AppError).status).toBe(429);
    }
  });
});
