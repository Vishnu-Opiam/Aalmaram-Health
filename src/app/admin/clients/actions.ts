"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound, validation } from "@/lib/errors";
import { clientSchema } from "@/lib/validation/schemas";
import { parseDateInput } from "@/domain/shared/dates";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import {
  accessTokenExpiry,
  buildInviteUrl,
  generateAccessToken,
  hashAccessToken,
} from "@/lib/auth/access-token";
import { env } from "@/lib/env";
import { sendClientInviteEmail } from "@/lib/services/notifications";
import { refreshUrl } from "@/lib/refresh-url";

type ClientInput = ReturnType<typeof parseForm<typeof clientSchema>>;

/** A relationship manager must be an active staff member. */
async function toData(input: ClientInput) {
  if (input.relationshipManagerId) {
    const manager = await prisma.user.findFirst({
      where: { id: input.relationshipManagerId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!manager) {
      throw validation("Please choose a relationship manager.", {
        relationshipManagerId: ["That staff member is not available."],
      });
    }
  }
  return {
    ...input,
    dateOfBirth: input.dateOfBirth ? parseDateInput(input.dateOfBirth) : null,
  };
}

export async function createClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("client.create", formData, async () => {
    const user = await requireUser();
    const input = parseForm(clientSchema, formData);
    const data = await toData(input);

    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({ data });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CLIENT_CREATED,
          entityType: "Client",
          entityId: created.id,
          actorUserId: user.id,
          actorLabel: user.name,
          // Deliberately no intake text in the audit metadata.
          metadata: { status: created.status },
        },
        tx,
      );
      return created;
    });

    return successState("Client created.", `/admin/clients/${client.id}`);
  });

  return result;
}

export async function updateClientAction(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("client.update", formData, async () => {
    const user = await requireUser();
    const input = parseForm(clientSchema, formData);

    const existing = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!existing) throw notFound("That client");
    const data = await toData(input);

    await prisma.$transaction(async (tx) => {
      await tx.client.update({ where: { id: clientId }, data });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CLIENT_UPDATED,
          entityType: "Client",
          entityId: clientId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { status: input.status },
        },
        tx,
      );
    });
    return successState(
      "Client updated.",
      refreshUrl(`/admin/clients/${clientId}`),
    );
  });
}

/**
 * Issues a fresh portal invitation link.
 *
 * Rotating the token invalidates any previous link, which is the intended
 * behaviour if a link is thought to have leaked.
 */
export async function issueClientInviteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("client.invite", formData, async () => {
    const user = await requireUser();
    const clientId = String(formData.get("clientId") ?? "");

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, email: true },
    });
    if (!client) throw notFound("That client");

    const token = generateAccessToken();
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          accessTokenHash: hashAccessToken(token),
          accessTokenIssuedAt: now,
          accessTokenExpiresAt: accessTokenExpiry(now),
        },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CLIENT_INVITED,
          entityType: "Client",
          entityId: clientId,
          actorUserId: user.id,
          actorLabel: user.name,
        },
        tx,
      );
    });

    const inviteUrl = buildInviteUrl(env().APP_URL, token);
    await sendClientInviteEmail({
      to: client.email,
      clientName: client.name,
      inviteUrl,
    });
    // No real email goes out with the log transport (prod too, for now), so the
    // admin gets the link to pass on. No redirect: a reload would lose it.
    if (env().EMAIL_TRANSPORT === "log") {
      return {
        ...successState(`New link for ${client.name}. Any previous link is now invalid.`),
        link: inviteUrl,
      };
    }
    return successState(
      `Invitation link sent to ${client.email}. Any previous link is now invalid.`,
      refreshUrl(`/admin/clients/${clientId}`),
    );
  });
}
