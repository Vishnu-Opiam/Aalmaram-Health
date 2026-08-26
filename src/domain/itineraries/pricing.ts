import { Prisma } from "@prisma/client";

/**
 * Pricing is informational only. There is no payment processing in this MVP;
 * these figures exist so the admin (and, if the business chooses, the client)
 * can see the indicative cost of a proposal.
 *
 * Money is handled with Prisma.Decimal end to end - never with JS floats.
 */
export type PriceableItem = {
  priceOverride: Prisma.Decimal | null;
  status: "PLANNED" | "CONFIRMED" | "REMOVED";
  component: { price: Prisma.Decimal; currency: string };
};

const ZERO = new Prisma.Decimal(0);

/** The price actually shown for an item: the override if set, else the component price. */
export function effectivePrice(item: PriceableItem): Prisma.Decimal {
  return item.priceOverride ?? item.component.price;
}

/** REMOVED items are excluded from every total. */
export function countsTowardsTotal(item: PriceableItem): boolean {
  return item.status !== "REMOVED";
}

export function sumItems(items: PriceableItem[]): Prisma.Decimal {
  return items
    .filter(countsTowardsTotal)
    .reduce<Prisma.Decimal>(
      (total, item) => total.plus(effectivePrice(item)),
      ZERO,
    );
}

export type DayTotal = {
  dayNumber: number | null;
  total: Prisma.Decimal;
  itemCount: number;
};

export function totalsByDay(
  items: (PriceableItem & { dayNumber: number | null })[],
): DayTotal[] {
  const buckets = new Map<string, DayTotal>();
  for (const item of items.filter(countsTowardsTotal)) {
    const key = item.dayNumber === null ? "unscheduled" : String(item.dayNumber);
    const bucket = buckets.get(key) ?? {
      dayNumber: item.dayNumber,
      total: ZERO,
      itemCount: 0,
    };
    bucket.total = bucket.total.plus(effectivePrice(item));
    bucket.itemCount += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => {
    if (a.dayNumber === null) return 1;
    if (b.dayNumber === null) return -1;
    return a.dayNumber - b.dayNumber;
  });
}

/**
 * The MVP assumes a single currency per proposal. If items disagree we surface
 * the mix rather than silently adding unlike currencies together.
 */
export function currenciesUsed(items: PriceableItem[]): string[] {
  return [
    ...new Set(
      items.filter(countsTowardsTotal).map((item) => item.component.currency),
    ),
  ].sort();
}

export function formatMoney(
  amount: Prisma.Decimal | number | string,
  currency = "EUR",
): string {
  const value =
    amount instanceof Prisma.Decimal
      ? amount.toNumber()
      : typeof amount === "string"
        ? Number(amount)
        : amount;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
