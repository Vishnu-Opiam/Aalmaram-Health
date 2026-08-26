import { formatShortDate, isWithinRange, toUtcDay } from "@/domain/shared/dates";

/**
 * Pre-publication validation.
 *
 * Rules are expressed over a plain shape rather than Prisma models so they can
 * be unit tested without a database, and so the same function can be reused for
 * an inline "why can't I publish yet?" panel in the builder.
 *
 * Nothing here repairs data. Publishing an incomplete proposal is a business
 * mistake, and silently fixing it would hide that from the admin.
 */

export type ValidatableComponent = {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

export type ValidatableItem = {
  id: string;
  scheduledDate: Date | null;
  status: "PLANNED" | "CONFIRMED" | "REMOVED";
  customTitle: string | null;
  component: ValidatableComponent | null;
};

export type ValidatableItinerary = {
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  client: { id: string; name: string } | null;
  items: ValidatableItem[];
};

export type ValidationIssue = {
  /** Stable machine code, used by tests and by the UI to link to a fix. */
  code:
    | "CLIENT_MISSING"
    | "TITLE_MISSING"
    | "TRIP_DATES_MISSING"
    | "TRIP_DATES_INVERTED"
    | "NO_ITEMS"
    | "ITEM_COMPONENT_MISSING"
    | "ITEM_COMPONENT_INACTIVE"
    | "ITEM_DATE_MISSING"
    | "ITEM_DATE_OUT_OF_RANGE";
  message: string;
  itemId?: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

const itemLabel = (item: ValidatableItem) =>
  item.customTitle?.trim() || item.component?.name || "An itinerary item";

export function validateItineraryForPublication(
  itinerary: ValidatableItinerary,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!itinerary.client) {
    issues.push({
      code: "CLIENT_MISSING",
      message: "This itinerary is not linked to a client.",
    });
  }

  if (!itinerary.title.trim()) {
    issues.push({
      code: "TITLE_MISSING",
      message: "Give the itinerary a title before publishing it.",
    });
  }

  const { startDate, endDate } = itinerary;
  if (!startDate || !endDate) {
    issues.push({
      code: "TRIP_DATES_MISSING",
      message:
        "Set both a trip start date and a trip end date before publishing.",
    });
  } else if (toUtcDay(endDate) < toUtcDay(startDate)) {
    issues.push({
      code: "TRIP_DATES_INVERTED",
      message: `The trip end date (${formatShortDate(endDate)}) falls before the start date (${formatShortDate(startDate)}).`,
    });
  }

  const activeItems = itinerary.items.filter((item) => item.status !== "REMOVED");

  if (activeItems.length === 0) {
    issues.push({
      code: "NO_ITEMS",
      message: "Add at least one component to the itinerary before publishing.",
    });
  }

  for (const item of activeItems) {
    if (!item.component) {
      issues.push({
        code: "ITEM_COMPONENT_MISSING",
        itemId: item.id,
        message: `${itemLabel(item)} points at a component that no longer exists. Remove it or replace it.`,
      });
      continue;
    }

    if (item.component.status !== "ACTIVE") {
      issues.push({
        code: "ITEM_COMPONENT_INACTIVE",
        itemId: item.id,
        message: `"${item.component.name}" is deactivated and cannot be proposed to a client. Remove it or reactivate the component.`,
      });
    }

    if (!item.scheduledDate) {
      issues.push({
        code: "ITEM_DATE_MISSING",
        itemId: item.id,
        message: `"${itemLabel(item)}" has no proposed date.`,
      });
    } else if (
      startDate &&
      endDate &&
      toUtcDay(endDate) >= toUtcDay(startDate) &&
      !isWithinRange(item.scheduledDate, startDate, endDate)
    ) {
      issues.push({
        code: "ITEM_DATE_OUT_OF_RANGE",
        itemId: item.id,
        message: `"${itemLabel(item)}" is proposed for ${formatShortDate(item.scheduledDate)}, which is outside the trip dates (${formatShortDate(startDate)} to ${formatShortDate(endDate)}).`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
