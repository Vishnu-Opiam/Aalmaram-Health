"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound, validation } from "@/lib/errors";
import { clientPasswordSchema, clientSchema } from "@/lib/validation/schemas";
import { parseDateInput } from "@/domain/shared/dates";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { hashPassword } from "@/lib/auth/password";
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
 * Creates or resets the client's portal login. The password is never emailed:
 * staff share it with the client directly. A reset signs out every session
 * issued before it (see clientSessionIsCurrent).
 */
export async function setClientPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("client.set_password", formData, async () => {
    const user = await requireUser();
    const input = parseForm(clientPasswordSchema, formData);

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!client) throw notFound("That client");

    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: client.id },
        data: { passwordHash, passwordSetAt: new Date() },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CLIENT_PASSWORD_SET,
          entityType: "Client",
          entityId: client.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { reset: client.passwordHash !== null },
        },
        tx,
      );
    });

    return successState(
      `Login saved. Share the password with the client; they sign in with ${client.email}.`,
      refreshUrl(`/admin/clients/${client.id}`),
    );
  });
}
