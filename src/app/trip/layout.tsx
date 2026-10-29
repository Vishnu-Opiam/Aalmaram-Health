import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { default: "Your trip", template: "%s · Aalmaram Health" },
  robots: { index: false, follow: false, nocache: true },
};

// Figtree: open, large x-height body text that stays readable at a glance.
// Fraunces: a warm display serif for headings, so the portal reads like a
// well-made travel letter rather than software.
const body = Figtree({ subsets: ["latin"], variable: "--font-portal-body", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-portal-display", display: "swap", axes: ["opsz"] });

/**
 * Client portal shell: fonts, base size and the standing disclaimer. 18 px
 * body text throughout — the clients are mostly 50+.
 */
export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={cn(body.variable, display.variable, "flex min-h-screen flex-col bg-sand-50 font-body text-[18px] text-ink-800")}>
      <a
        href="#trip-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-[17px] focus:shadow"
      >
        Skip to content
      </a>

      <main id="trip-content" className="flex-1">
        {children}
      </main>

      {/* Bottom padding on phones leaves room for the portal's tab bar. */}
      <footer className="border-t border-sand-200 pb-24 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="max-w-3xl text-[16px] leading-relaxed text-ink-600">
            This page is personal to you. Aalmaram Health coordinates your trip with independent providers in Kerala;
            it does not provide medical advice, diagnosis or treatment. Clinical decisions rest with the providers who
            care for you.
          </p>
        </div>
      </footer>
    </div>
  );
}
