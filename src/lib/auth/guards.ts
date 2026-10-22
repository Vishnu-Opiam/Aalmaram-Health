import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { StaffRole } from "@prisma/client";
import { unauthenticated } from "@/lib/errors";
import { readAdminSession, readClientSession } from "@/lib/auth/session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roles: StaffRole[];
};

/**
 * The single place that answers "who is making this request?".
 *
 * Server Components and Server Actions must call one of these guards; nothing
 * downstream is allowed to take an actor id from client input.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readAdminSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, roles: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, name: user.name, email: user.email, roles: user.roles };
});

/** For Server Actions and API routes: throws instead of redirecting. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

/** For pages: sends the visitor to the login screen. */
export async function requireUserPage(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login",
    );
  }
  return user;
}

export type CurrentClient = {
  id: string;
  name: string;
  email: string;
};

export const getCurrentClient = cache(
  async (): Promise<CurrentClient | null> => {
    const session = await readClientSession();
    if (!session) return null;
    const client = await prisma.client.findUnique({
      where: { id: session.clientId },
      select: { id: true, name: true, email: true, status: true },
    });
    if (!client || client.status === "ARCHIVED") return null;
    return { id: client.id, name: client.name, email: client.email };
  },
);

export async function requireClient(): Promise<CurrentClient> {
  const client = await getCurrentClient();
  if (!client) throw unauthenticated();
  return client;
}

export async function requireClientPage(): Promise<CurrentClient> {
  const client = await getCurrentClient();
  if (!client) redirect("/trip/sign-in");
  return client;
}
