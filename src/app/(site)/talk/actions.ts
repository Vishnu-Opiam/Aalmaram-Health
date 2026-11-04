"use server";

import { headers } from "next/headers";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordWebsiteRequest } from "@/lib/services/website-requests";
import { talkRequestSchema } from "@/lib/validation/schemas";
import { parseForm, runAction, successState, type FormState } from "@/lib/validation/form";

/** Public and unauthenticated: rate-limited per connection and per email. */
export async function requestConversationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("site.talk.request", formData, async () => {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    enforceRateLimit(`${ip}:talk`, 5, 60 * 60_000);
    const input = parseForm(talkRequestSchema, formData);
    // A filled honeypot is a bot: pretend it worked so it learns nothing.
    if (input.website) return successState("Thank you.", "/talk/thanks");
    enforceRateLimit(`talk:${input.email}`, 3, 60 * 60_000);
    await recordWebsiteRequest(input);
    return successState("Thank you.", "/talk/thanks");
  });
}
