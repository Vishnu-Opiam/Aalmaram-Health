import "server-only";
import { prisma } from "@/lib/db";
import { forbidden, validation } from "@/lib/errors";
import { dayNumberFor, isWithinRange, parseDateInput } from "@/domain/shared/dates";
import { loadTripForMutation } from "./itinerary-blocks";

/**
 * What a client's "Ask <coordinator> about this" refers to. Every id comes from
 * the browser, so each is checked against the client's world: the trip must be
 * theirs (else FORBIDDEN), a block must sit in that trip, a component or place
 * must be one the portal shows (active), a day must fall within the trip.
 */
export type PersonRequestContext = {
  componentId: string | null;
  componentName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  blockId: string | null;
  dayKey: string | null;
  dayNumber: number | null;
};

export async function resolvePersonRequest(
  clientId: string,
  input: { tripId: string; componentId: string | null; vendorSlug: string | null; blockId: string | null; dayKey: string | null },
) {
  const trip = await loadTripForMutation(input.tripId, { kind: "client", clientId });

  const block = input.blockId
    ? await prisma.itineraryItem.findFirst({
        where: { id: input.blockId, itineraryId: trip.itinerary.id },
        select: { id: true, component: { select: { id: true, name: true, vendor: { select: { id: true, name: true } } } } },
      })
    : null;
  if (input.blockId && !block) throw forbidden("That activity is not part of this trip.");

  const component = input.componentId
    ? await prisma.component.findFirst({
        where: { id: input.componentId, status: "ACTIVE", vendor: { status: "ACTIVE" } },
        select: { id: true, name: true, vendor: { select: { id: true, name: true } } },
      })
    : (block?.component ?? null);
  if (input.componentId && !component) throw validation("That experience is not available.");

  const vendor = input.vendorSlug
    ? await prisma.vendor.findFirst({ where: { slug: input.vendorSlug, status: "ACTIVE" }, select: { id: true, name: true } })
    : (component?.vendor ?? null);
  if (input.vendorSlug && !vendor) throw validation("That place is not available.");

  if (input.dayKey && !isWithinRange(parseDateInput(input.dayKey), trip.startDate, trip.endDate)) {
    throw validation("That day is not part of this trip.");
  }

  const context: PersonRequestContext = {
    componentId: component?.id ?? null,
    componentName: component?.name ?? null,
    vendorId: vendor?.id ?? null,
    vendorName: vendor?.name ?? null,
    blockId: block?.id ?? null,
    dayKey: input.dayKey,
    dayNumber: input.dayKey ? dayNumberFor(trip.startDate, parseDateInput(input.dayKey)) : null,
  };
  return { trip, context };
}

/** "Kathakali Performance at Kalari Heritage Collective, Day 4": catalogue names only, for staff. */
export function describePersonRequest(c: Pick<PersonRequestContext, "componentName" | "vendorName" | "dayNumber">): string | null {
  const what = [c.componentName, c.vendorName].filter(Boolean).join(" at ");
  const parts = [what, c.dayNumber ? `Day ${c.dayNumber}` : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** For the admin activity list: entry id → "about …" text of each "asked for a person" entry. */
export async function personRequestLabels(
  entries: { id: string; action: string; metadata: unknown }[],
): Promise<Map<string, string>> {
  const asks = entries
    .filter((e) => e.action === "client.asked_for_person" && e.metadata && typeof e.metadata === "object")
    .map((e) => ({ id: e.id, meta: e.metadata as { componentId?: string | null; vendorId?: string | null; dayNumber?: number | null } }));
  const ids = (key: "componentId" | "vendorId") => asks.map((a) => a.meta[key]).filter((v): v is string => typeof v === "string");
  const [components, vendors] = await Promise.all([
    prisma.component.findMany({ where: { id: { in: ids("componentId") } }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ where: { id: { in: ids("vendorId") } }, select: { id: true, name: true } }),
  ]);
  const name = (list: { id: string; name: string }[], id?: string | null) => list.find((x) => x.id === id)?.name ?? null;
  const labels = new Map<string, string>();
  for (const { id, meta } of asks) {
    const about = describePersonRequest({
      componentName: name(components, meta.componentId),
      vendorName: name(vendors, meta.vendorId),
      dayNumber: typeof meta.dayNumber === "number" ? meta.dayNumber : null,
    });
    if (about) labels.set(id, about);
  }
  return labels;
}
