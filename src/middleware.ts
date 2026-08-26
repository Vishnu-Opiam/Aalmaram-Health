import { NextResponse, type NextRequest } from "next/server";

/**
 * Every response under /admin and /trip carries client data - intake notes,
 * proposals, the What-to-Expect report. None of it may be written to a shared
 * or intermediary cache, and a back-button press after sign-out must not
 * redisplay it from the browser's cache.
 *
 * Authorisation itself is NOT done here. Middleware runs before the route and
 * cannot see the database; every page and Server Action calls its own guard
 * (requireUserPage / requireClientPage / requireUser). This only sets headers.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/trip")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/trip/:path*"],
};
