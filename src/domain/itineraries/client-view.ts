import "server-only";
import { prisma } from "@/lib/db";
import {
  CLIENT_VISIBLE_STATUSES,
  type ClientVisibleStatus,
} from "@/domain/itineraries/status";
import { dayNumberFor } from "@/domain/shared/dates";
import { effectivePrice } from "@/domain/itineraries/pricing";

/**
 * The client-facing projection of an itinerary.
 *
 * This is the ONLY shape the portal renders. Internal fields - internalNotes,
 * adminNotes, costStatus, source, vendor contact details, activity, change
 * request internals - are not selected at all, so they cannot leak through a
 * careless template change later.
 *
 * Prices are included in the projection but the portal decides whether to show
 * them (see SHOW_PRICES_TO_CLIENT below). The business may not want to.
 */

/**
 * Whether the client sees indicative prices. The MVP defaults to false: the
 * Aalmaram team discusses cost by phone/email while the operating model is
 * still manual. Flip this once the commercial policy is settled.
 */
export const SHOW_PRICES_TO_CLIENT = false;

export type ClientItineraryItem = {
  id: string;
  title: string;
  date: Date | null;
  dayNumber: number | null;
  moduleName: string;
  catalogueName: string;
  vendorName: string;
  vendorLocation: string | null;
  description: string;
  whatsIncluded: string | null;
  clientDeliverable: string | null;
  note: string | null;
  price: string | null;
  currency: string;
  unit: string;
};

export type ClientItineraryDay = {
  key: string;
  dayNumber: number | null;
  date: Date | null;
  items: ClientItineraryItem[];
};

export type ClientItineraryView = {
  id: string;
  title: string;
  status: ClientVisibleStatus;
  startDate: Date | null;
  endDate: Date | null;
  welcomeNote: string | null;
  publishedAt: Date | null;
  approvedAt: Date | null;
  days: ClientItineraryDay[];
  itemCount: number;
  report: { title: string; content: string; publishedAt: Date | null } | null;
  openChangeRequests: { id: string; createdAt: Date; scope: string }[];
};

/**
 * Loads the client-visible proposal for a client.
 *
 * Authorisation: clientId always comes from the session. Only itineraries in a
 * client-visible status are returned, so a draft or withdrawn proposal simply
 * does not exist as far as the portal is concerned.
 */
export async function loadClientItinerary(
  clientId: string,
  itineraryId?: string,
): Promise<ClientItineraryView | null> {
  const itinerary = await prisma.itinerary.findFirst({
    where: {
      clientId,
      status: { in: [...CLIENT_VISIBLE_STATUSES] },
      ...(itineraryId ? { id: itineraryId } : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      clientNotes: true,
      publishedAt: true,
      approvedAt: true,
      report: {
        select: {
          title: true,
          content: true,
          status: true,
          publishedAt: true,
        },
      },
      changeRequests: {
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, itineraryItemId: true },
      },
      items: {
        where: { status: { not: "REMOVED" } },
        orderBy: [
          { dayNumber: "asc" },
          { sequence: "asc" },
          { createdAt: "asc" },
        ],
        select: {
          id: true,
          scheduledDate: true,
          dayNumber: true,
          customTitle: true,
          clientFacingNotes: true,
          priceOverride: true,
          component: {
            select: {
              name: true,
              price: true,
              currency: true,
              unit: true,
              clientFacingDescription: true,
              whatsIncluded: true,
              clientDeliverable: true,
              vendor: { select: { name: true, location: true } },
              catalogue: {
                select: { name: true, module: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!itinerary) return null;

  const items: ClientItineraryItem[] = itinerary.items.map((item) => ({
    id: item.id,
    title: item.customTitle?.trim() || item.component.name,
    date: item.scheduledDate,
    dayNumber:
      item.scheduledDate && itinerary.startDate
        ? dayNumberFor(itinerary.startDate, item.scheduledDate)
        : item.dayNumber,
    moduleName: item.component.catalogue.module.name,
    catalogueName: item.component.catalogue.name,
    vendorName: item.component.vendor.name,
    vendorLocation: item.component.vendor.location,
    description: item.component.clientFacingDescription,
    whatsIncluded: item.component.whatsIncluded,
    clientDeliverable: item.component.clientDeliverable,
    note: item.clientFacingNotes,
    price: SHOW_PRICES_TO_CLIENT
      ? effectivePrice({
          priceOverride: item.priceOverride,
          status: "PLANNED",
          component: {
            price: item.component.price,
            currency: item.component.currency,
          },
        }).toString()
      : null,
    currency: item.component.currency,
    unit: item.component.unit,
  }));

  const days = groupClientItems(items);

  return {
    id: itinerary.id,
    title: itinerary.title,
    status: itinerary.status as ClientItineraryView["status"],
    startDate: itinerary.startDate,
    endDate: itinerary.endDate,
    welcomeNote: itinerary.clientNotes,
    publishedAt: itinerary.publishedAt,
    approvedAt: itinerary.approvedAt,
    days,
    itemCount: items.length,
    // A report is only ever exposed once it has been published.
    report:
      itinerary.report && itinerary.report.status === "PUBLISHED"
        ? {
            title: itinerary.report.title,
            content: itinerary.report.content,
            publishedAt: itinerary.report.publishedAt,
          }
        : null,
    openChangeRequests: itinerary.changeRequests.map((request) => ({
      id: request.id,
      createdAt: request.createdAt,
      scope: request.itineraryItemId ? "item" : "trip",
    })),
  };
}

function groupClientItems(items: ClientItineraryItem[]): ClientItineraryDay[] {
  const groups = new Map<string, ClientItineraryDay>();

  for (const item of items) {
    const key = item.date ? item.date.toISOString().slice(0, 10) : "unscheduled";
    const group = groups.get(key) ?? {
      key,
      dayNumber: item.dayNumber,
      date: item.date,
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
