/**
 * Where a portal action may send the client back to (`returnTo`). Only known
 * portal pages, same origin, so the field can never become an open redirect.
 */

const PORTAL_ROUTES = [
  /^\/trip$/,
  /^\/trip\/itinerary$/,
  /^\/trip\/itinerary\/confirm$/,
  /^\/trip\/explore$/,
  /^\/trip\/explore\/[a-z0-9-]{1,120}$/,
  /^\/trip\/chat$/,
  /^\/trip\/kerala$/,
];

// One-shot markers a fresh redirect sets again; dropped so they never pile up.
const TRANSIENT = ["u", "added", "asked", "just", "moved"];

/**
 * The cleaned path + query when `value` is a known portal page, else null.
 * `marker` (e.g. `{ added: blockId }`) is appended to the query; the hash is kept.
 */
export function safePortalReturn(value: string, marker: Record<string, string> = {}): string | null {
  // Reject protocol-relative ("//evil"), backslash tricks and anything absolute before parsing.
  if (!value.startsWith("/trip") || value.startsWith("//") || /[\\\s]/.test(value) || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value, "http://portal.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "http://portal.invalid" || !PORTAL_ROUTES.some((r) => r.test(url.pathname))) return null;
  for (const key of TRANSIENT) url.searchParams.delete(key);
  for (const [key, val] of Object.entries(marker)) url.searchParams.set(key, val);
  return `${url.pathname}${url.search}${url.hash}`;
}
