import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dayNumberFor } from "@/domain/shared/dates";
import { validateItineraryForPublication } from "@/domain/itineraries/validation";
import {
  currenciesUsed,
  sumItems,
  totalsByDay,
} from "@/domain/itineraries/pricing";

export const itineraryDetailInclude = {
  client: true,
  report: true,
  changeRequests: {
    orderBy: { createdAt: "desc" },
    include: {
      itineraryItem: {
        select: {
          id: true,
          customTitle: true,
          component: { select: { name: true } },
        },
      },
    },
  },
  items: {
    orderBy: [
      { dayNumber: "asc" },
      { sequence: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      component: {
        include: {
          vendor: {
            select: { id: true, name: true, hqCity: true, status: true },
          },
          catalogue: {
            select: {
              id: true,
              name: true,
              module: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ItineraryInclude;

export type ItineraryDetail = Prisma.ItineraryGetPayload<{
  include: typeof itineraryDetailInclude;
}>;

export type ItineraryItemDetail = ItineraryDetail["items"][number];

export async function loadItineraryDetail(
  itineraryId: string,
): Promise<ItineraryDetail | null> {
  return prisma.itinerary.findUnique({
    where: { id: itineraryId },
    include: itineraryDetailInclude,
  });
}

/**
 * Groups items into days for both the admin builder and the client timeline.
 *
 * Items without a proposed date fall into a trailing "unscheduled" group rather
 * than being hidden - an admin must be able to see what is still unplaced.
 */
export type ItineraryDay = {
  key: string;
  dayNumber: number | null;
  date: Date | null;
  items: ItineraryItemDetail[];
};

export function groupItemsByDay(
  itinerary: Pick<ItineraryDetail, "startDate">,
  items: ItineraryItemDetail[],
): ItineraryDay[] {
  const groups = new Map<string, ItineraryDay>();

  for (const item of items) {
    const date = item.scheduledDate;
    const dayNumber =
      date && itinerary.startDate
        ? dayNumberFor(itinerary.startDate, date)
        : (item.dayNumber ?? null);
    const key = date ? date.toISOString().slice(0, 10) : "unscheduled";

    const group = groups.get(key) ?? {
      key,
      dayNumber,
      date: date ?? null,
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });
}

/** Everything the builder needs to render its summary panel. */
export function summariseItinerary(itinerary: ItineraryDetail) {
  const activeItems = itinerary.items.filter((item) => item.status !== "REMOVED");
  const validation = validateItineraryForPublication({
    title: itinerary.title,
    startDate: itinerary.startDate,
    endDate: itinerary.endDate,
    client: { id: itinerary.client.id, name: itinerary.client.name },
    items: itinerary.items.map((item) => ({
      id: item.id,
      scheduledDate: item.scheduledDate,
      status: item.status,
      customTitle: item.customTitle,
      component: {
        id: item.component.id,
        name: item.component.name,
        status: item.component.status,
      },
    })),
  });

  return {
    validation,
    itemCount: activeItems.length,
    total: sumItems(activeItems),
    currencies: currenciesUsed(activeItems),
    dayTotals: totalsByDay(activeItems),
    openChangeRequests: itinerary.changeRequests.filter(
      (request) => request.status === "OPEN",
    ),
  };
}

/**
 * The next free sequence number within a day, so a newly added component lands
 * at the end of that day rather than colliding with an existing item.
 */
export async function nextSequenceForDay(
  itineraryId: string,
  dayNumber: number | null,
  tx: Prisma.TransactionClient,
): Promise<number> {
  const last = await tx.itineraryItem.findFirst({
    where: { itineraryId, dayNumber },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (last?.sequence ?? -1) + 1;
}
