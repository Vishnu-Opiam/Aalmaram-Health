import { Suspense } from "react";
import { requireClientPage } from "@/lib/auth/guards";
import { RevealObserver } from "@/components/portal/kit/reveal";
import { signOutClientAction } from "../actions";
import { PortalHeader, PortalTabBar } from "./portal-nav";

/**
 * The client's five places: My trip (home), Day by day, Explore, Ask us and
 * Kerala. A night header on wide screens, a night tab bar on phones, paper in
 * between. Large targets and plain words — most clients are 55+.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireClientPage();
  const signOut = (
    <form action={signOutClientAction}>
      <button
        type="submit"
        className="inline-flex min-h-12 items-center text-[16px] font-medium text-night-muted underline-offset-[6px] hover:text-night-ink hover:underline md:text-[17px]"
      >
        Sign out
      </button>
    </form>
  );

  return (
    <>
      <Suspense fallback={null}>
        <PortalHeader signOut={signOut} />
      </Suspense>
      <main id="trip-content" className="flex-1">
        {children}
      </main>
      {/* The standing disclaimer, quiet. Room below it on phones for the tab bar. */}
      <footer className="mt-16 border-t border-paper-line pb-[calc(64px+env(safe-area-inset-bottom)+24px)] md:mt-28 md:pb-0">
        <div className="pk-frame py-8">
          <p className="max-w-[68ch] text-[16px] leading-relaxed text-mist-muted">
            This page is personal to you. Aalmaram Health coordinates your trip with independent providers in Kerala;
            it does not provide medical advice, diagnosis or treatment. Clinical decisions rest with the providers who
            care for you.
          </p>
        </div>
      </footer>
      <Suspense fallback={null}>
        <PortalTabBar />
      </Suspense>
      <RevealObserver />
    </>
  );
}
