import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRICE_UNIT_LABELS } from "@/domain/vendors/profile";
import { toDateInputValue } from "@/domain/shared/dates";
import {
  blockDay,
  blockEndsAt,
  findOverlaps,
  formatTime,
  groupBlocksByDay,
  itineraryTotal,
} from "./blocks";
import { actualMix } from "./module-mix";
import { isItineraryEditable } from "./status";
import { blockProgress } from "@/domain/bookings/status";
import type { BranchOption, BuilderTrip, Library } from "./builder-view";

const branchLabel = (b: { name: string; city: string }) =>
  b.name === b.city || b.name.includes(b.city) ? b.name : `${b.name}, ${b.city}`;

const activeBranches = {
  where: { status: "ACTIVE" },
  orderBy: [{ city: "asc" }, { name: "asc" }],
  select: { id: true, name: true, city: true },
} satisfies Prisma.Vendor$branchesArgs;

const builderInclude = {
  requirements: { include: { moduleMix: { include: { module: { select: { name: true } } } } } },
  itinerary: {
    include: {
      items: {
        orderBy: { startsAt: "asc" },
        include: {
          branch: { select: { id: true, name: true, city: true } },
          booking: { select: { status: true } },
          component: {
            include: {
              catalogue: { select: { name: true, module: { select: { id: true, name: true } } } },
              practitioners: {
                where: { practitioner: { status: "ACTIVE" } },
                select: {
                  practitioner: {
                    select: {
                      name: true,
                      role: true,
                      qualifications: true,
                      yearsOfExperience: true,
                      languages: true,
                    },
                  },
                },
              },
              // Client-safe vendor fields only: never contact, phone, email or notes.
              vendor: {
                select: {
                  name: true,
                  description: true,
                  accreditations: true,
                  languages: true,
                  yearEstablished: true,
                  branches: activeBranches,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TripInclude;

/**
 * Loads a trip as the builder shows it. `clientId`, when given, scopes the
 * lookup to that client's own trips (portal); the client may only change the
 * blocks they or the AI added, never the team's health core.
 */
export async function loadBuilderTrip(
  tripId: string,
  viewer: { kind: "staff" } | { kind: "client"; clientId: string },
): Promise<BuilderTrip | null> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...(viewer.kind === "client" ? { clientId: viewer.clientId } : {}) },
    include: builderInclude,
  });
  if (!trip || !trip.itinerary) return null;

  const items = trip.itinerary.items;
  const editable = isItineraryEditable(trip.status, trip.itinerary.confirmedAt);
  const overlapping = new Set(
    findOverlaps(
      items.map((i) => ({ id: i.id, startsAt: i.startsAt, durationMinutes: i.component.durationMinutes })),
    ).flat(),
  );

  const blocks = items.map((item) => {
    const c = item.component;
    return {
      startsAt: item.startsAt,
      id: item.id,
      componentId: c.id,
      title: item.customTitle?.trim() || c.name,
      day: blockDay(item.startsAt),
      time: formatTime(item.startsAt),
      endTime: formatTime(blockEndsAt(item.startsAt, c.durationMinutes)),
      durationMinutes: c.durationMinutes,
      addedBy: item.addedBy,
      canEdit: editable && (viewer.kind === "staff" || item.addedBy !== "TEAM"),
      price: item.price.toString(),
      currency: item.currency,
      priceUnitLabel: PRICE_UNIT_LABELS[c.priceUnit],
      moduleName: c.catalogue.module.name,
      moduleId: c.catalogue.module.id,
      catalogueName: c.catalogue.name,
      description: c.clientFacingDescription,
      whatsIncluded: c.whatsIncluded,
      deliverable: c.clientDeliverable,
      recoveryMinutes: c.recoveryTimeMinutes,
      branchId: item.branchId,
      branchLabel: item.branch ? branchLabel(item.branch) : null,
      branches: c.vendor.branches.map((b) => ({ id: b.id, label: branchLabel(b) })),
      provider: {
        name: c.vendor.name,
        description: c.vendor.description,
        accreditations: c.vendor.accreditations,
        languages: c.vendor.languages,
        yearEstablished: c.vendor.yearEstablished,
      },
      practitioners: c.practitioners.map((p) => p.practitioner),
      note: item.clientFacingNotes,
      overlaps: overlapping.has(item.id),
      progress: blockProgress(trip.itinerary!.confirmedAt !== null, item.booking?.status ?? null),
      bookingStatus: viewer.kind === "staff" ? (item.booking?.status ?? "PENDING") : null,
    };
  });

  const { total, currency, mixedCurrencies } = itineraryTotal(items);
  const actual = actualMix(blocks.map((b) => ({ moduleId: b.moduleId, durationMinutes: b.durationMinutes })));
  const moduleNames = new Map(blocks.map((b) => [b.moduleId, b.moduleName]));
  const targets = trip.requirements?.moduleMix ?? [];
  for (const share of targets) moduleNames.set(share.moduleId, share.module.name);
  const mix = [...moduleNames.entries()].map(([moduleId, moduleName]) => ({
    moduleName,
    target: targets.find((t) => t.moduleId === moduleId)?.percent ?? null,
    actual: actual.find((a) => a.moduleId === moduleId)?.percent ?? 0,
  }));

  return {
    id: trip.id,
    name: trip.name,
    startDate: toDateInputValue(trip.startDate),
    endDate: toDateInputValue(trip.endDate),
    travellers: trip.travellers,
    status: trip.status,
    editable,
    confirmedAt: trip.itinerary.confirmedAt?.toISOString() ?? null,
    total: total.toString(),
    currency,
    mixedCurrencies,
    blockCount: blocks.length,
    days: groupBlocksByDay(trip.startDate, trip.endDate, blocks).map((d) => ({
      key: d.key,
      dayNumber: d.dayNumber,
      // Strip the server-only helper fields before they cross to the browser.
      blocks: d.blocks.map(({ startsAt: _s, moduleId: _m, ...block }) => block),
    })),
    mix,
  };
}

/** Everything bookable: active components of active vendors, by module → catalogue. */
export async function loadLibrary(): Promise<Library> {
  const modules = await prisma.module.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      catalogues: {
        where: { status: "ACTIVE" },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          components: {
            where: { status: "ACTIVE", vendor: { status: "ACTIVE" } },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              clientFacingDescription: true,
              clientDeliverable: true,
              price: true,
              currency: true,
              priceUnit: true,
              durationMinutes: true,
              vendor: { select: { name: true, branches: activeBranches } },
            },
          },
        },
      },
    },
  });

  return {
    modules: modules.map((m) => ({
      id: m.id,
      name: m.name,
      catalogues: m.catalogues
        .filter((c) => c.components.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          components: c.components.map((comp) => ({
            id: comp.id,
            name: comp.name,
            description: comp.clientFacingDescription,
            deliverable: comp.clientDeliverable,
            price: comp.price.toString(),
            currency: comp.currency,
            priceUnitLabel: PRICE_UNIT_LABELS[comp.priceUnit],
            durationMinutes: comp.durationMinutes,
            vendorName: comp.vendor.name,
            branches: comp.vendor.branches.map((b): BranchOption => ({ id: b.id, label: branchLabel(b) })),
          })),
        })),
    })),
  };
}
