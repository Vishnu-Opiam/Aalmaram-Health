import { Prisma } from "@prisma/client";

/**
 * Money is handled with Prisma.Decimal end to end - never with JS floats.
 * Block prices and itinerary totals live in `src/domain/trips/blocks.ts`.
 */
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
