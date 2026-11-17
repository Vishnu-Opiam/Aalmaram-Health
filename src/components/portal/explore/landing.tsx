"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { AppLink } from "@/components/ui/primitives";
import { Chip, MODULE, ModuleDot, Photo, SectionHeading, buttonClass, type Kind } from "@/components/portal/kit";
import { useUrlPanel } from "@/components/portal/sheet";
import type { LibraryComponent, Place, PlacePhoto } from "@/domain/trips/builder-view";
import { cn, pluralise } from "@/lib/utils";
import { ExperienceCard, PlaceCard } from "./cards";
import { ExperiencePanel } from "./experience-panel";
import { KINDS, arrangePlaces, carryQuery, heroOf, photoForExperience, placeKind, toPhoto, type ExploreContext } from "./model";

type Entry = { item: LibraryComponent; photo: PlacePhoto | null; kind: Kind; text: string };

const isKind = (v: string | null): v is Kind => v === "health" || v === "wellness" || v === "culture";
const WORD: Record<Kind, string> = { health: "Health", wellness: "Wellness", culture: "Culture" };
const LINE: Record<Kind, string> = {
  health: "Check-ups, consultations and Ayurveda hospitals",
  wellness: "Retreats, treatments, yoga and quiet",
  culture: "Museums, walks, boats, performances and food",
};

/**
 * Explore's list page: search, three module photographs that filter, the
 * places we work with as a photo grid, then the experiences that can be put
 * straight into the trip. Filter and search live in the URL (`?module=`,
 * `?q=`), so they survive a visit to a place page and the Back button.
 */
export function ExploreLanding({ places, context }: { places: Place[]; context: ExploreContext }) {
  const params = useSearchParams();
  const [module, setModule] = useState<Kind | null>(() => (isKind(params.get("module")) ? (params.get("module") as Kind) : null));
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [itemId, openItem, closeItem] = useUrlPanel("item");

  // URL as the state's memory: replace, so Back still leaves Explore in one step.
  const remember = (next: { module?: Kind | null; q?: string }) => {
    const url = new URL(window.location.href);
    const m = "module" in next ? next.module : module;
    const q = "q" in next ? next.q : query;
    if (m) url.searchParams.set("module", m);
    else url.searchParams.delete("module");
    if (q?.trim()) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  };
  const pickModule = (k: Kind | null) => {
    setModule(k);
    remember({ module: k });
  };

  const entries = useMemo<Entry[]>(
    () =>
      places.flatMap((p) =>
        p.experiences.map((item, i) => ({
          item,
          photo: photoForExperience(p, i),
          kind: placeKind({ module: item.moduleName }) ?? "culture",
          text: [item.name, item.description, item.place.name, item.place.city, item.moduleName, ...item.tags].join(" ").toLowerCase(),
        })),
      ),
    [places],
  );
  const placeText = useMemo(
    () => new Map(places.map((p) => [p.slug, [p.name, p.typeLabel, p.city, p.description, ...p.highlights, ...p.modules].join(" ").toLowerCase()])),
    [places],
  );

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every((w) => text.includes(w));
  const shownPlaces = places.filter((p) => (!module || placeKind(p) === module) && matches(placeText.get(p.slug)!));
  const shownEntries = entries.filter((e) => (!module || e.kind === module) && matches(e.text));
  const opened = entries.find((e) => e.item.id === itemId)?.item ?? null;

  const carry = (extra: Record<string, string | null> = {}) =>
    carryQuery(params, { module: module ?? null, q: query.trim() || null, ...extra });

  // The tile photograph for each module: the strongest place photograph in it.
  const tiles = KINDS.map((k) => {
    const inKind = places.filter((p) => placeKind(p) === k);
    const lead = arrangePlaces(inKind).find((p) => heroOf(p));
    return {
      kind: k,
      places: inKind.length,
      experiences: entries.filter((e) => e.kind === k).length,
      photo: lead ? heroOf(lead)! : null,
      from: lead,
    };
  });

  const total = { places: shownPlaces.length, experiences: shownEntries.length };
  const kinds = module ? [module] : KINDS;
  const searching = words.length > 0;

  return (
    <>
      <section className="pk-night pb-20 pt-10 md:pb-32 md:pt-16" aria-labelledby="explore-title">
        <div className="pk-frame grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-16">
          <div>
            <p className="pk-label">Explore</p>
            <h1 id="explore-title" className="pk-h1 mt-3">
              The places we know in Kerala
            </h1>
            <p className="pk-body mt-4 max-w-[34rem] text-night-muted">
              Hospitals, retreats, museums and walks we work with, and what you can do at each. Open any of them to see more.
            </p>
          </div>
          <div>
            <label className="relative block">
              <span className="sr-only">Search experiences and places</span>
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-night-muted" strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  remember({ q: e.target.value });
                }}
                placeholder="Try “yoga”, “museum” or “Kochi”"
                className="block h-14 w-full rounded-full border-2 border-night-muted/50 bg-night-raised pl-13 pr-5 text-[18px] text-night-ink placeholder:text-night-muted hover:border-night-muted focus:border-brass"
              />
            </label>
            <p className="mt-3 text-[16px] text-night-muted" aria-live="polite">
              {searching
                ? `${pluralise(total.places, "place")} and ${pluralise(total.experiences, "experience")} match`
                : (
                  <>
                    <a href="#places" className="underline decoration-night-muted/50 underline-offset-[5px] hover:text-night-ink">
                      {pluralise(total.places, "place")}
                    </a>{" "}
                    ·{" "}
                    <a href="#experiences" className="underline decoration-night-muted/50 underline-offset-[5px] hover:text-night-ink">
                      {pluralise(total.experiences, "experience")} you can add
                    </a>
                  </>
                )}
            </p>
            {context.trip && context.tripCount > 1 && (
              <p className="mt-1 text-[16px] text-night-muted">
                Adding to <span className="text-night-ink">{context.trip.name}</span> ·{" "}
                <a href="/trip" className="underline underline-offset-[5px] hover:text-night-ink">
                  Switch trip
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="pk-frame">
        {/* Three photographs, one per module, that filter everything below. */}
        <div role="group" aria-label="Show" className="relative -mt-12 grid grid-cols-3 gap-2 md:-mt-20 md:gap-5">
          {tiles.map((t, i) => {
            const pressed = module === t.kind;
            return (
              <button
                key={t.kind}
                type="button"
                aria-pressed={pressed}
                aria-label={`${WORD[t.kind]}: ${pluralise(t.places, "place")}, ${pluralise(t.experiences, "experience")}`}
                onClick={() => pickModule(pressed ? null : t.kind)}
                className={cn("group block text-left transition-opacity duration-300", module && !pressed && "opacity-60 hover:opacity-100")}
              >
                <Photo
                  photo={t.photo ? toPhoto(t.photo) : null}
                  fallback={{ title: WORD[t.kind], kind: t.kind }}
                  sizes="(min-width: 768px) 30vw, 33vw"
                  priority={i < 3}
                  scrim="bottom"
                  zoom
                  className="aspect-[3/4] md:aspect-[4/3]"
                  overlayClassName="flex-col justify-end p-3 md:p-6"
                >
                  {t.photo && (
                    <>
                      {/* Gambarino's descenders hang below a 1.0 line box, so the title keeps real leading above the line under it. */}
                      <span className="font-display text-[24px] leading-[1.15] min-[390px]:text-[26px] md:text-[40px] lg:text-[48px]">{WORD[t.kind]}</span>
                      <span className="mt-2 hidden text-[16px] leading-snug text-night-ink/85 md:line-clamp-2">{LINE[t.kind]}</span>
                    </>
                  )}
                </Photo>
                <span className="mt-2 flex items-center gap-2 text-[15px] text-mist-muted md:mt-3 md:text-[16px]">
                  {pressed && <span aria-hidden="true" className="h-[3px] w-6 shrink-0 bg-mist-ink" />}
                  <span className={cn("min-w-0 truncate", pressed && "font-medium text-mist-ink")}>
                    {pressed ? "Showing" : pluralise(t.places, "place")}
                    <span className="max-md:hidden"> {t.from ? ` · Photo: ${t.from.name}` : ""}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {module && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Chip pressed={false} onClick={() => pickModule(null)}>
              Everything
            </Chip>
            <p className="text-[17px] text-mist-muted">
              Showing <ModuleDot kind={module} className="font-medium text-mist-ink" /> only
            </p>
          </div>
        )}

        {total.places + total.experiences === 0 ? (
          <div className="pk-section max-w-[40rem]">
            <h2 className="pk-h2">Nothing matches “{query.trim()}”</h2>
            <p className="pk-body mt-4 text-mist-muted">
              Try a shorter word{module ? ", or show everything" : ""}. If you have something in mind, ask {context.coordinator}: we may well be able to
              arrange it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClass("primary")}
                onClick={() => {
                  setQuery("");
                  setModule(null);
                  remember({ q: "", module: null });
                }}
              >
                Clear the search
              </button>
              <AppLink href={`/trip/chat${context.trip ? `?trip=${encodeURIComponent(context.trip.id)}` : ""}`} className={buttonClass("secondary")}>
                Ask {context.coordinator}
              </AppLink>
            </div>
          </div>
        ) : (
          <>
            {total.places > 0 && (
              <section id="places" aria-labelledby="places-title" className="mt-14 scroll-mt-28 md:mt-24">
                <SectionHeading
                  id="places-title"
                  title="Places we work with"
                  lead="Open a place to see its photographs, what it is known for and what we can arrange there."
                />
                {/* Places whose module isn't on record yet come last, under their own heading. */}
                {[...kinds, ...(module ? [] : [null])].map((k) => {
                  const list = shownPlaces.filter((p) => placeKind(p) === k);
                  if (!list.length) return null;
                  const ordered = searching ? list : arrangePlaces(list);
                  let typo = 0;
                  return (
                    <section key={k ?? "other"} aria-label={`${k ? WORD[k] : "More"} places`} className="mt-10 md:mt-14">
                      <ModuleHeading kind={k} count={pluralise(list.length, "place")} />
                      <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 md:mt-7 md:grid-cols-3 md:gap-x-6 md:gap-y-12">
                        {ordered.map((p, i) => (
                          <PlaceCard
                            key={p.slug}
                            place={p}
                            href={`/trip/explore/${p.slug}${carry()}`}
                            days={context.inTrip.byPlace[p.slug]}
                            lead={!searching && i === 0 && ordered.length > 2}
                            tone={heroOf(p) ? undefined : typo++ % 2 === 0 ? "night" : "paper"}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </section>
            )}

            {total.experiences > 0 && (
              <section id="experiences" aria-labelledby="experiences-title" className="pk-section scroll-mt-28 border-t border-paper-line pt-12 md:pt-16">
                <SectionHeading
                  id="experiences-title"
                  title="Things you can add"
                  lead={
                    context.trip?.editable
                      ? "Open one to read what is included, then choose a day for it. Nothing is booked until you confirm your trip."
                      : "Open one to read what is included and what it costs."
                  }
                />
                {kinds.map((k) => {
                  const list = shownEntries.filter((e) => e.kind === k);
                  if (!list.length) return null;
                  return (
                    <section key={k} aria-label={`${WORD[k]} experiences`} className="mt-10 md:mt-14">
                      <ModuleHeading kind={k} count={pluralise(list.length, "experience")} />
                      <ul className="mt-5 grid gap-5 md:mt-7 md:grid-cols-3 md:gap-x-6 md:gap-y-12">
                        {list.map((e) => (
                          <ExperienceCard
                            key={e.item.id}
                            item={e.item}
                            photo={e.photo}
                            days={context.inTrip.byComponent[e.item.id]}
                            onOpen={() => openItem(e.item.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>

      {opened && <ExperiencePanel item={opened} context={context} onClose={closeItem} />}
    </>
  );
}

function ModuleHeading({ kind, count }: { kind: Kind | null; count: string }) {
  return (
    <h3 className="flex items-baseline gap-3 border-b border-paper-line pb-3">
      {kind && <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 -translate-y-1 rounded-full", MODULE[kind].dot)} />}
      <span className="font-display text-[30px] leading-none md:text-[36px]">{kind ? WORD[kind] : "More places"}</span>
      <span className="ml-auto text-[16px] text-mist-muted">{count}</span>
    </h3>
  );
}
