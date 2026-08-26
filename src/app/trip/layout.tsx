import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Your journey", template: "%s · Aalmaram Health" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Client portal shell.
 *
 * Deliberately spare: no navigation chrome, no internal vocabulary, generous
 * whitespace. The client should feel like they are reading a letter, not
 * operating software.
 */
export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <a
        href="#trip-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
          <p className="font-serif text-lg tracking-tight text-ink-900">
            Aalmaram Health
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">
            Kerala
          </p>
        </div>
      </header>

      <main id="trip-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-sand-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <p className="text-xs leading-relaxed text-ink-400">
            This page is personal to you. Aalmaram Health coordinates your
            journey with independent providers in Kerala; it does not provide
            medical advice, diagnosis or treatment. Clinical decisions rest with
            the providers who care for you.
          </p>
        </div>
      </footer>
    </div>
  );
}
