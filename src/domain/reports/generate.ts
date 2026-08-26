import { formatDateRange, formatLongDate } from "@/domain/shared/dates";

/**
 * What-to-Expect report generation.
 *
 * Hard rule: this function composes ONLY text that already exists in the
 * database (component descriptions, what's included, deliverables, vendor
 * names, dates). It never invents medical claims, outcomes, vendor credentials
 * or advice. Any editorial framing is generic, factual and non-clinical.
 *
 * Output is Markdown. The admin may edit it freely before publishing.
 */

export type ReportItem = {
  dayNumber: number | null;
  scheduledDate: Date | null;
  title: string;
  moduleName: string;
  catalogueName: string;
  vendorName: string;
  vendorLocation: string | null;
  clientFacingDescription: string;
  whatsIncluded: string | null;
  clientDeliverable: string | null;
  clientFacingNotes: string | null;
};

export type ReportInput = {
  clientName: string;
  itineraryTitle: string;
  startDate: Date | null;
  endDate: Date | null;
  items: ReportItem[];
};

function bullet(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line.replace(/^[-*•]\s*/, "")}`)
    .join("\n");
}

function groupByDay(items: ReportItem[]) {
  const groups = new Map<string, { label: string; order: number; items: ReportItem[] }>();
  for (const item of items) {
    const key =
      item.dayNumber === null ? "unscheduled" : `day-${item.dayNumber}`;
    const label =
      item.dayNumber === null
        ? "Not yet scheduled"
        : `Day ${item.dayNumber}${item.scheduledDate ? ` - ${formatLongDate(item.scheduledDate)}` : ""}`;
    const group = groups.get(key) ?? {
      label,
      order: item.dayNumber ?? Number.MAX_SAFE_INTEGER,
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

export function defaultReportTitle(itineraryTitle: string): string {
  return `What to Expect - ${itineraryTitle}`;
}

export function generateReportContent(input: ReportInput): string {
  const { clientName, itineraryTitle, startDate, endDate, items } = input;
  const lines: string[] = [];

  lines.push(`# ${itineraryTitle}`);
  lines.push("");
  lines.push(`Prepared for **${clientName}** by Aalmaram Health.`);
  lines.push("");

  // --- Trip overview -------------------------------------------------------
  lines.push("## Your journey at a glance");
  lines.push("");
  lines.push(`**Dates:** ${formatDateRange(startDate, endDate)}`);

  const modules = [...new Set(items.map((i) => i.moduleName))];
  if (modules.length > 0) {
    lines.push("");
    lines.push(`**Areas covered:** ${modules.join(", ")}`);
  }

  const activeDays = new Set(
    items.filter((i) => i.dayNumber !== null).map((i) => i.dayNumber),
  ).size;
  lines.push("");
  lines.push(
    `**Scheduled elements:** ${items.length} across ${activeDays} day${activeDays === 1 ? "" : "s"}.`,
  );
  lines.push("");
  lines.push(
    "This document sets out what has been arranged for you, what each element involves, and what you can expect to receive. It describes the plan we are proposing - it is not medical advice, and it is not a confirmation of appointment times with individual providers. The Aalmaram team confirms each appointment with the provider directly and will tell you the final times.",
  );
  lines.push("");

  // --- Day by day ----------------------------------------------------------
  lines.push("## Day by day");
  lines.push("");

  const groups = groupByDay(items);
  if (groups.length === 0) {
    lines.push("_No elements have been added to this itinerary yet._");
    lines.push("");
  }

  for (const group of groups) {
    lines.push(`### ${group.label}`);
    lines.push("");
    for (const item of group.items) {
      lines.push(`#### ${item.title}`);
      lines.push("");
      lines.push(
        `_${item.moduleName} - ${item.catalogueName} - provided by ${item.vendorName}${item.vendorLocation ? `, ${item.vendorLocation}` : ""}_`,
      );
      lines.push("");
      lines.push(item.clientFacingDescription.trim());
      lines.push("");

      if (item.whatsIncluded?.trim()) {
        lines.push("**What is included**");
        lines.push("");
        lines.push(bullet(item.whatsIncluded));
        lines.push("");
      }

      if (item.clientDeliverable?.trim()) {
        lines.push("**What you receive**");
        lines.push("");
        lines.push(bullet(item.clientDeliverable));
        lines.push("");
      }

      if (item.clientFacingNotes?.trim()) {
        lines.push("**A note from your Aalmaram coordinator**");
        lines.push("");
        lines.push(item.clientFacingNotes.trim());
        lines.push("");
      }
    }
  }

  // --- Deliverables summary ------------------------------------------------
  const deliverables = items
    .filter((i) => i.clientDeliverable?.trim())
    .map((i) => `${i.title}: ${i.clientDeliverable!.trim()}`);

  if (deliverables.length > 0) {
    lines.push("## What you will take home");
    lines.push("");
    lines.push(bullet(deliverables.join("\n")));
    lines.push("");
  }

  // --- Factual, non-clinical expectations ----------------------------------
  lines.push("## Practical expectations");
  lines.push("");
  lines.push(
    bullet(
      [
        "Times shown are proposed. Aalmaram confirms each appointment with the provider and shares the final schedule with you before you travel.",
        "Bring any existing reports, prescriptions or records you would like a provider to see. Aalmaram does not hold your medical records.",
        "Providers may ask you to complete their own intake or consent forms on arrival.",
        "If anything in this plan does not suit you, use the Request changes option on your proposal page and we will revise it.",
      ].join("\n"),
    ),
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_This report describes the journey Aalmaram Health has proposed for you. It is not a medical opinion, diagnosis or treatment recommendation. Clinical decisions rest with the treating providers._",
  );
  lines.push("");

  return lines.join("\n");
}
