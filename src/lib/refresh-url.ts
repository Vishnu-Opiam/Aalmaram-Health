import { randomUUID } from "node:crypto";

/**
 * Destination for a Server Action that stays on the page it was invoked from.
 *
 * Next's in-place re-render after a Server Action does not reliably repaint
 * this app: `revalidatePath`, the implicit post-action refresh and
 * `router.refresh()` all leave the route showing stale data even though the
 * write has committed and the server has already served the new payload.
 * Navigating to a *different* URL always works.
 *
 * So a same-page mutation returns the same route plus a one-shot nonce. Nothing
 * reads the parameter - its only job is to make the URL differ so the router
 * performs a real navigation and fetches fresh server data. The alternative,
 * a full page reload, would throw away scroll position and the itinerary
 * builder's filter state on every click.
 */
export function refreshUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}u=${randomUUID().slice(0, 8)}`;
}
