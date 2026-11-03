import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordSafely } from "@/lib/auth/password";
import {
  __resetRateLimits,
  consumeRateLimit,
  enforceRateLimit,
} from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { clientPasswordSchema } from "@/lib/validation/schemas";

describe("client portal password rules", () => {
  it("requires at least 10 characters", () => {
    expect(clientPasswordSchema.safeParse({ clientId: "c1", password: "short" }).success).toBe(false);
    expect(clientPasswordSchema.safeParse({ clientId: "c1", password: "Kerala-2026" }).success).toBe(true);
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
