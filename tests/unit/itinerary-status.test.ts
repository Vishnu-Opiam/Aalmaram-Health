import { describe, expect, it } from "vitest";
import type { ItineraryStatus } from "@prisma/client";
import {
  assertEditable,
  assertTransition,
  canTransition,
  clientFacingStatus,
  isClientVisible,
  isEditable,
} from "@/domain/itineraries/status";
import { AppError } from "@/lib/errors";

const ALL: ItineraryStatus[] = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "PUBLISHED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "ARCHIVED",
];

describe("itinerary status transitions", () => {
  it("allows the happy path DRAFT → READY_FOR_REVIEW → PUBLISHED → APPROVED", () => {
    expect(canTransition("DRAFT", "READY_FOR_REVIEW")).toBe(true);
    expect(canTransition("READY_FOR_REVIEW", "PUBLISHED")).toBe(true);
    expect(canTransition("PUBLISHED", "APPROVED")).toBe(true);
  });

  it("allows the change-request loop PUBLISHED → CHANGES_REQUESTED → DRAFT → PUBLISHED", () => {
    expect(canTransition("PUBLISHED", "CHANGES_REQUESTED")).toBe(true);
    expect(canTransition("CHANGES_REQUESTED", "DRAFT")).toBe(true);
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(true);
  });

  it("allows re-publishing directly from CHANGES_REQUESTED", () => {
    expect(canTransition("CHANGES_REQUESTED", "PUBLISHED")).toBe(true);
  });

  it("treats a no-op transition as allowed", () => {
    for (const status of ALL) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it("refuses to jump from DRAFT straight to APPROVED", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("refuses to approve an archived itinerary", () => {
    expect(canTransition("ARCHIVED", "APPROVED")).toBe(false);
    expect(canTransition("ARCHIVED", "PUBLISHED")).toBe(false);
  });

  it("refuses CHANGES_REQUESTED from a draft the client has never seen", () => {
    expect(canTransition("DRAFT", "CHANGES_REQUESTED")).toBe(false);
    expect(canTransition("READY_FOR_REVIEW", "CHANGES_REQUESTED")).toBe(false);
  });

  it("assertTransition throws a CONFLICT AppError with a readable message", () => {
    expect(() => assertTransition("DRAFT", "APPROVED")).toThrowError(AppError);
    try {
      assertTransition("DRAFT", "APPROVED");
    } catch (error) {
      expect((error as AppError).code).toBe("CONFLICT");
      expect((error as AppError).message).toContain("Draft");
      expect((error as AppError).message).toContain("Approved");
    }
  });
});

describe("client visibility", () => {
  it("exposes only PUBLISHED, CHANGES_REQUESTED and APPROVED", () => {
    expect(isClientVisible("PUBLISHED")).toBe(true);
    expect(isClientVisible("CHANGES_REQUESTED")).toBe(true);
    expect(isClientVisible("APPROVED")).toBe(true);
    expect(isClientVisible("DRAFT")).toBe(false);
    expect(isClientVisible("READY_FOR_REVIEW")).toBe(false);
    expect(isClientVisible("ARCHIVED")).toBe(false);
  });

  it("never labels a hidden status with client-facing decision wording", () => {
    expect(clientFacingStatus("DRAFT").label).toBe("In preparation");
    expect(clientFacingStatus("APPROVED").tone).toBe("success");
  });
});

describe("editability", () => {
  it("allows editing only in DRAFT and READY_FOR_REVIEW", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("READY_FOR_REVIEW")).toBe(true);
    expect(isEditable("PUBLISHED")).toBe(false);
    expect(isEditable("CHANGES_REQUESTED")).toBe(false);
    expect(isEditable("APPROVED")).toBe(false);
  });

  it("assertEditable explains how to unlock a published itinerary", () => {
    expect(() => assertEditable("DRAFT")).not.toThrow();
    try {
      assertEditable("PUBLISHED");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as AppError).code).toBe("CONFLICT");
      expect((error as AppError).message).toMatch(/back to Draft/i);
    }
  });

  it("editable and client-visible sets do not overlap", () => {
    for (const status of ALL) {
      expect(isEditable(status) && isClientVisible(status)).toBe(false);
    }
  });
});
