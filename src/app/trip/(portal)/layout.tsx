import { Suspense } from "react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink as Link } from "@/components/ui/primitives";
import { PortalBrand } from "@/components/portal/ui";
import { signOutClientAction } from "../actions";
import { PortalNav } from "./portal-nav";

/**
 * The client's four places: My trip (home), Day by day, Ask us and Kerala.
 * Large targets and plain words — most clients are 50+ (docs/platform/portal-ux.md).
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireClientPage();
  return (
    <>
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <Link href="/trip" aria-label="Aalmaram Health — my trip">
            <PortalBrand />
          </Link>
          <Suspense fallback={null}>
            <PortalNav variant="top" />
          </Suspense>
        </div>
      </header>
      {children}
      <form action={signOutClientAction} className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <button type="submit" className="min-h-12 text-[16px] text-ink-600 underline underline-offset-4 hover:text-ink-900">
          Sign out of this device
        </button>
      </form>
      <Suspense fallback={null}>
        <PortalNav variant="bottom" />
      </Suspense>
    </>
  );
}
