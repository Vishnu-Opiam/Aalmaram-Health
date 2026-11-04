import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createClientRecord, prisma, resetDatabase } from "./helpers";
import { recordWebsiteRequest } from "@/lib/services/website-requests";
import { talkRequestSchema } from "@/lib/validation/schemas";

const form = (overrides: Record<string, string> = {}) =>
  talkRequestSchema.parse({
    name: "Website Visitor (demo)",
    email: "Visitor@Example.com",
    country: "Slovenia",
    callTime: "Any time",
    health: "on",
    message: "We would like to come in March (demo).",
    consent: "on",
    ...overrides,
  });

describe("free-conversation requests from the website (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a LEAD client with the request as a WEBSITE conversation", async () => {
    const result = await recordWebsiteRequest(form());
    expect(result.newClient).toBe(true);

    const client = await prisma.client.findUniqueOrThrow({ where: { id: result.clientId }, include: { conversations: true } });
    expect(client).toMatchObject({ email: "visitor@example.com", status: "LEAD", country: "Slovenia" });
    expect(client.conversations).toHaveLength(1);
    expect(client.conversations[0].channel).toBe("WEBSITE");
    expect(client.conversations[0].transcript).toContain("Interested in: health");
    expect(client.conversations[0].transcript).toContain("come in March");
  });

  it("never changes an existing client's record from the public form", async () => {
    const existing = await createClientRecord({ email: "visitor@example.com" });
    const before = await prisma.client.findUniqueOrThrow({ where: { id: existing.id } });

    const result = await recordWebsiteRequest(form({ name: "Someone Else", phone: "+44 000" }));
    expect(result).toEqual({ clientId: existing.id, newClient: false });

    const after = await prisma.client.findUniqueOrThrow({ where: { id: existing.id } });
    expect(after.name).toBe(before.name);
    expect(after.phone).toBe(before.phone);
    expect(after.status).toBe(before.status);
    expect(await prisma.conversation.count({ where: { clientId: existing.id, channel: "WEBSITE" } })).toBe(1);
  });

  it("keeps what the visitor wrote out of the audit log", async () => {
    const { clientId } = await recordWebsiteRequest(form());
    const entries = await prisma.activityLog.findMany({ where: { entityId: clientId } });
    expect(entries.map((e) => e.action)).toEqual(["client.website_request"]);
    expect(JSON.stringify(entries)).not.toContain("March");
  });

  it("requires consent and a valid email", () => {
    expect(talkRequestSchema.safeParse({ ...form(), consent: undefined }).success).toBe(false);
    expect(talkRequestSchema.safeParse({ ...form(), email: "not-an-email" }).success).toBe(false);
  });
});
