import "server-only";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { sendStaffWebsiteRequestNotice } from "@/lib/services/notifications";
import type { TalkRequestInput } from "@/lib/validation/schemas";

/**
 * A free-conversation request from the public site becomes a LEAD client plus
 * a WEBSITE conversation, so it lands in the admin the team already uses.
 *
 * The visitor is not signed in, so an existing client's record is never
 * changed from here: their request is only attached as a new conversation.
 */
export async function recordWebsiteRequest(input: TalkRequestInput) {
  const interests = (["health", "wellness", "culture"] as const).filter((key) => input[key]);
  const transcript = [
    `Country: ${input.country}`,
    input.phone ? `Phone: ${input.phone}` : null,
    `Best time to call: ${input.callTime}`,
    `Interested in: ${interests.length ? interests.join(", ") : "not sure yet"}`,
    input.message ? `\n${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.client.findUnique({ where: { email: input.email }, select: { id: true, name: true } });
    const client =
      existing ??
      (await tx.client.create({
        data: { name: input.name, email: input.email, phone: input.phone, country: input.country, status: "LEAD" },
        select: { id: true, name: true },
      }));
    const conversation = await tx.conversation.create({
      data: { clientId: client.id, channel: "WEBSITE", occurredAt: new Date(), transcript },
      select: { id: true },
    });
    await logActivity(
      {
        action: ACTIVITY_ACTIONS.WEBSITE_REQUEST_RECEIVED,
        entityType: "Client",
        entityId: client.id,
        actorLabel: "Website",
        metadata: { conversationId: conversation.id, newClient: !existing },
      },
      tx,
    );
    return { clientId: client.id, newClient: !existing };
  });

  await sendStaffWebsiteRequestNotice({ name: input.name, adminUrl: `${env().APP_URL}/admin/clients/${result.clientId}` });

  return result;
}
