"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, MessageCircle, Search } from "lucide-react";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDuration } from "@/domain/vendors/profile";
import type { Library, LibraryComponent } from "@/domain/trips/builder-view";
import { cn } from "@/lib/utils";
import { Sheet, useUrlPanel } from "./sheet";
import { KIND, KindIcon, kindOf, pill } from "./ui";

type Entry = LibraryComponent & { moduleId: string; moduleName: string; catalogueName: string };

/**
 * Everything we offer, to browse at leisure: pick an area, search in plain
 * words, open any experience for the full story and its provider. Planning
 * itself stays on Day by day; this page only links there.
 */
export function ExploreBrowser({ library, tripId }: { library: Library; tripId: string | null }) {
  const entries = useMemo<Entry[]>(
    () =>
      library.modules.flatMap((m) =>
        m.catalogues.flatMap((c) =>
          c.components.map((comp) => ({ ...comp, moduleId: m.id, moduleName: m.name, catalogueName: c.name })),
        ),
      ),
    [library],
  );
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, open, close] = useUrlPanel("item");
  const opened = entries.find((e) => e.id === openId) ?? null;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = entries.filter(
    (e) =>
      (!moduleId || e.moduleId === moduleId) &&
      words.every((w) =>
        [e.name, e.description, e.catalogueName, e.vendorName, ...e.tags].some((text) => text.toLowerCase().includes(w)),
      ),
  );
  // Keep the library's own order: module → catalogue → name.
  const groups = [...new Set(shown.map((e) => `${e.moduleName} · ${e.catalogueName}`))].map((title) => ({
    title,
    items: shown.filter((e) => `${e.moduleName} · ${e.catalogueName}` === title),
  }));

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-5 text-[17px] font-semibold transition-colors",
      active ? "border-forest-900 bg-forest-900 text-white" : "border-sand-300 bg-white text-ink-800 hover:border-forest-800",
    );

  return (
    <>
      <div className="mt-8 flex flex-col gap-4">
        <label className="relative block max-w-xl">
          <span className="sr-only">Search experiences</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-600" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, for example “yoga” or “dinner”"
            className="block min-h-14 w-full rounded-full border-2 border-sand-300 bg-white pl-12 pr-5 text-[18px] text-ink-900 focus:border-forest-800 focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          <button type="button" className={chip(moduleId === null)} aria-pressed={moduleId === null} onClick={() => setModuleId(null)}>
            Everything
          </button>
          {library.modules.map((m) => {
            const { Icon } = KIND[kindOf(m.name)];
            return (
              <button key={m.id} type="button" className={chip(m.id === moduleId)} aria-pressed={m.id === moduleId} onClick={() => setModuleId(m.id)}>
                <Icon className="h-5 w-5" aria-hidden="true" /> {m.name}
              </button>
            );
          })}
        </div>
        <p className="text-[17px] text-ink-700" aria-live="polite">
          {shown.length === 1 ? "1 experience" : `${shown.length} experiences`}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="portal-card mt-6 p-6 sm:p-8">
          <p className="text-[19px] font-semibold text-ink-900">Nothing matches that yet.</p>
          <p className="mt-2 text-[17px] leading-relaxed text-ink-700">
            Try a shorter word, choose “Everything”, or ask us — we may be able to arrange it.
          </p>
          <a href={tripId ? `/trip/chat?trip=${encodeURIComponent(tripId)}` : "/trip/chat"} className={pill("secondary", "mt-5")}>
            <MessageCircle className="h-5 w-5" aria-hidden="true" /> Ask us
          </a>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.title} aria-label={group.title} className="mt-10">
            <h2 className="font-display text-[26px] font-semibold text-ink-900">{group.title}</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => open(e.id)}
                    aria-label={`${e.name}. Open details`}
                    className="portal-card flex h-full w-full flex-col p-5 text-left transition-colors hover:border-forest-800 sm:p-6"
                  >
                    <span className="flex items-start gap-3">
                      <KindIcon moduleName={e.moduleName} />
                      <span className="min-w-0">
                        <span className="block text-[19px] font-semibold leading-snug text-ink-900">{e.name}</span>
                        <span className="mt-0.5 block text-[16px] text-ink-600">{e.vendorName}</span>
                      </span>
                    </span>
                    <span className="mt-3 line-clamp-3 flex-1 text-[17px] leading-relaxed text-ink-700">{e.description}</span>
                    <span className="mt-4 flex items-center justify-between gap-3 text-[16px] font-semibold text-ink-800">
                      <span>
                        {formatDuration(e.durationMinutes)} · {formatMoney(e.price, e.currency)} {e.priceUnitLabel}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-ink-600" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {opened && <ExperienceSheet entry={opened} tripId={tripId} onClose={close} />}
    </>
  );
}

function ExperienceSheet({ entry, tripId, onClose }: { entry: Entry; tripId: string | null; onClose: () => void }) {
  const kind = KIND[kindOf(entry.moduleName)];
  const trip = tripId ? `trip=${encodeURIComponent(tripId)}&` : "";
  const provider = entry.provider;
  return (
    <Sheet label={entry.name} onClose={onClose}>
      <p className="flex items-center gap-3 text-[17px] font-medium text-ink-700">
        <KindIcon moduleName={entry.moduleName} /> {kind.label} · {entry.catalogueName}
      </p>
      <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight text-ink-900">{entry.name}</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-700">{entry.description}</p>

      <dl className="mt-6 divide-y divide-sand-200 rounded-3xl border border-sand-200 bg-white px-5">
        <Fact label="How long">{formatDuration(entry.durationMinutes)}</Fact>
        <Fact label="Price">
          {formatMoney(entry.price, entry.currency)} {entry.priceUnitLabel}
        </Fact>
        <Fact label="Where">
          {entry.branches.length > 1
            ? `${entry.branches.length} locations: ${entry.branches.map((b) => b.label).join(", ")}`
            : (entry.branches[0]?.label ?? provider.name)}
        </Fact>
        {entry.deliverable && <Fact label="You receive">{entry.deliverable}</Fact>}
      </dl>

      {entry.whatsIncluded && (
        <section className="mt-8">
          <h3 className="font-display text-[22px] font-semibold text-ink-900">What is included</h3>
          <p className="mt-2 whitespace-pre-wrap text-[17px] leading-relaxed text-ink-700">{entry.whatsIncluded}</p>
        </section>
      )}

      <section className="mt-8">
        <h3 className="font-display text-[22px] font-semibold text-ink-900">About {provider.name}</h3>
        {provider.description && <p className="mt-2 text-[17px] leading-relaxed text-ink-700">{provider.description}</p>}
        <p className="mt-2 text-[16px] leading-relaxed text-ink-600">
          {[
            provider.yearEstablished && `Since ${provider.yearEstablished}`,
            provider.languages.length > 0 && `Speaks ${provider.languages.join(", ")}`,
            provider.accreditations.length > 0 && provider.accreditations.join(", "),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {tripId && (
          <a href={`/trip/itinerary?${trip}`.replace(/&$/, "")} className={pill("primary")}>
            Add it on Day by day <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
        )}
        <a href={`/trip/chat?${trip}about=${encodeURIComponent(entry.name)}`} className={pill("secondary")}>
          <MessageCircle className="h-5 w-5" aria-hidden="true" /> Ask us about this
        </a>
      </div>
    </Sheet>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-[16px] font-semibold text-ink-600">{label}</dt>
      <dd className="text-[17px] leading-relaxed text-ink-900">{children}</dd>
    </div>
  );
}
