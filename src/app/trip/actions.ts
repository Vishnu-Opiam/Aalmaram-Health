"use server";

import { redirect } from "next/navigation";
import { destroyClientSession } from "@/lib/auth/session";

export async function signOutClientAction() {
  await destroyClientSession();
  redirect("/trip/sign-in?error=signed_out");
}
