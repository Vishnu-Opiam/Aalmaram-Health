/**
 * Indicative prices on the public site are set in euros (what providers
 * quote) and shown with an approximate pound figure for UK visitors.
 * Whole euros are enough here: these are orientation figures, never a quote.
 */

// shortcut: fixed rate, reviewed by hand; switch to a daily rate if prices start to drift.
export const EUR_TO_GBP = 0.86;

const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

/** Rounded to £5 so it never looks more precise than it is. */
export const toGbp = (euros: number) => Math.round((euros * EUR_TO_GBP) / 5) * 5;

export const formatEur = (euros: number) => eur.format(euros);
export const formatGbp = (euros: number) => `≈ ${gbp.format(toGbp(euros))}`;

/** "€250 · ≈ £215" */
export const formatPrice = (euros: number) => `${formatEur(euros)} · ${formatGbp(euros)}`;

/** "€2,200–€3,000 · ≈ £1,890–£2,580" */
export const formatPriceRange = (from: number, to: number) =>
  `${formatEur(from)}–${formatEur(to)} · ≈ ${gbp.format(toGbp(from))}–${gbp.format(toGbp(to))}`;
