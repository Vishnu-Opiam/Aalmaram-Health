import "server-only";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Email abstraction.
 *
 * The product only needs three transactional messages in the MVP. A provider
 * (Resend, SES, Postmark, SMTP) can be dropped in behind `EmailTransport`
 * without touching a single call site.
 *
 * Notifications never block the operation that triggered them: `notify()`
 * catches and logs delivery failures. Publishing a proposal must not fail
 * because an SMTP host is unreachable.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain text. Kept deliberately simple and free of health details. */
  body: string;
};

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

/** Development transport: writes to stdout and to .mail.log at the repo root. */
class LogTransport implements EmailTransport {
  readonly name = "log";

  async send(message: EmailMessage): Promise<void> {
    const rendered = [
      "──────────── EMAIL (development transport) ────────────",
      `From:    ${env().EMAIL_FROM}`,
      `To:      ${message.to}`,
      `Subject: ${message.subject}`,
      "",
      message.body,
      "───────────────────────────────────────────────────────",
      "",
    ].join("\n");

    console.log(rendered);

    try {
      fs.appendFileSync(
        path.join(process.cwd(), ".mail.log"),
        `${new Date().toISOString()}\n${rendered}\n`,
        "utf8",
      );
    } catch {
      // A read-only filesystem is fine - stdout already has the message.
    }
  }
}

/**
 * Placeholder SMTP transport. Intentionally not wired to a mail library: the
 * MVP ships with EMAIL_TRANSPORT="log". Selecting "smtp" fails loudly at
 * startup rather than silently dropping mail.
 */
class SmtpTransport implements EmailTransport {
  readonly name = "smtp";

  async send(): Promise<void> {
    throw new Error(
      'EMAIL_TRANSPORT="smtp" is selected but no SMTP provider is configured. Implement SmtpTransport in src/lib/services/notifications.ts or set EMAIL_TRANSPORT="log".',
    );
  }
}

let transport: EmailTransport | null = null;

export function getEmailTransport(): EmailTransport {
  if (!transport) {
    transport = env().EMAIL_TRANSPORT === "smtp" ? new SmtpTransport() : new LogTransport();
  }
  return transport;
}

/** Test seam. */
export function setEmailTransport(next: EmailTransport | null) {
  transport = next;
}

async function notify(message: EmailMessage): Promise<boolean> {
  try {
    await getEmailTransport().send(message);
    logger.info("notification sent", {
      transport: getEmailTransport().name,
      subject: message.subject,
    });
    return true;
  } catch (error) {
    logger.error("notification failed", error, { subject: message.subject });
    return false;
  }
}

// --- the three MVP notifications -------------------------------------------

export function sendProposalPublishedEmail(input: {
  to: string;
  clientName: string;
  itineraryTitle: string;
  inviteUrl: string;
}) {
  return notify({
    to: input.to,
    subject: `Your Aalmaram journey proposal is ready: ${input.itineraryTitle}`,
    body: [
      `Dear ${input.clientName},`,
      "",
      "Your proposed journey is ready for you to review.",
      "",
      "You can see the day-by-day plan, read the What-to-Expect report, and then either approve the proposal or tell us what you would like changed.",
      "",
      `Open your proposal: ${input.inviteUrl}`,
      "",
      "This link is personal to you. Please do not forward it.",
      "",
      "Warm regards,",
      "The Aalmaram Health team",
    ].join("\n"),
  });
}

export function sendClientApprovedEmail(input: {
  to: string;
  clientName: string;
  itineraryTitle: string;
  adminUrl: string;
}) {
  return notify({
    to: input.to,
    subject: `Approved: ${input.clientName} - ${input.itineraryTitle}`,
    body: [
      `${input.clientName} has approved the itinerary "${input.itineraryTitle}".`,
      "",
      `Open it in the admin dashboard: ${input.adminUrl}`,
      "",
      "Next step: confirm each element with the providers.",
    ].join("\n"),
  });
}

export function sendChangeRequestedEmail(input: {
  to: string;
  clientName: string;
  itineraryTitle: string;
  scope: string;
  adminUrl: string;
}) {
  return notify({
    to: input.to,
    subject: `Changes requested: ${input.clientName} - ${input.itineraryTitle}`,
    body: [
      `${input.clientName} has requested changes to "${input.itineraryTitle}".`,
      "",
      `Scope: ${input.scope}`,
      "",
      `Read the request and revise the proposal: ${input.adminUrl}`,
      "",
      "The message itself is only in the dashboard - it is deliberately not copied into email.",
    ].join("\n"),
  });
}

export function sendClientInviteEmail(input: {
  to: string;
  clientName: string;
  inviteUrl: string;
}) {
  return notify({
    to: input.to,
    subject: "Your Aalmaram Health journey portal",
    body: [
      `Dear ${input.clientName},`,
      "",
      "Here is your personal link to the Aalmaram Health journey portal, where you will find your proposal as soon as it is ready.",
      "",
      input.inviteUrl,
      "",
      "This link is personal to you. Please do not forward it.",
      "",
      "Warm regards,",
      "The Aalmaram Health team",
    ].join("\n"),
  });
}
