import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink } from "@/components/ui/primitives";
import { ModuleDot, Photo, buttonClass } from "@/components/portal/kit";
import { AskForm } from "@/components/portal/explore/ask";
import { InTrip, typeLine } from "@/components/portal/explore/cards";
import { ChoosingBanner } from "@/components/portal/explore/choosing";
import { carryQuery, heroOf, placeKind, toPhoto } from "@/components/portal/explore/model";
import { PlaceExperiences } from "@/components/portal/explore/place-experiences";
import { PlaceGallery } from "@/components/portal/explore/place-gallery";
import { ExploreToasts } from "@/components/portal/explore/toasts";
import { loadPlace } from "@/domain/trips/queries";
import { cn, param, pluralise } from "@/lib/utils";
import { loadExploreContext } from "../context";

type Props = {
  params: Promise<{ place: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = await loadPlace((await params).place);
  return { title: place ? `${place.name} · Explore` : "Explore" };
}

/**
 * One partner place: its photograph across the page, the gallery, plain facts
 * from its profile (only what we hold, nothing added), and what can be added
 * from here. With no priced experiences yet, the one action is asking the
 * coordinator to arrange a visit.
 */
export default async function PlacePage({ params, searchParams }: Props) {
  const client = await requireClientPage();
  const [{ place: slug }, search] = await Promise.all([params, searchParams]);
  const [place, { context, added }] = await Promise.all([loadPlace(slug), loadExploreContext(client.id, search)]);
  if (!place) notFound();

  const hero = heroOf(place);
  const kind = placeKind(place);
  const flat = Object.fromEntries(["trip", "module", "q", "for", "slot"].map((k) => [k, param(search, k) || undefined]));
  const back = `/trip/explore${carryQuery(flat)}`;
  const days = context.inTrip.byPlace[place.slug];
  const meta = typeLine(place);
  const facts = [
    place.yearEstablished && { value: String(place.yearEstablished), label: "Founded" },
    place.languages.length > 0 && { value: String(place.languages.length), label: place.languages.length === 1 ? "Language" : "Languages" },
    place.locations.length > 1 && { value: String(place.locations.length), label: "Locations" },
  ].filter((f): f is { value: string; label: string } => Boolean(f));

  const backLink = (onPhoto: boolean) => (
    <AppLink
      href={back}
      aria-label="Back to Explore"
      className={cn(
        "inline-flex min-h-12 items-center gap-1 rounded-full pr-4 text-[17px] font-medium",
        onPhoto ? "bg-night/55 pl-2 text-night-ink hover:bg-night/80" : "-ml-1 pl-0 text-night-muted hover:text-night-ink",
      )}
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" /> Explore
    </AppLink>
  );
  const title = (
    <>
      {kind && (
        <ModuleDot kind={kind} label={meta || undefined} className="text-[16px] font-medium text-night-ink/85 md:text-[17px]" />
      )}
      <h1 className="pk-h1 mt-3 max-w-[18ch]">{place.name}</h1>
    </>
  );

  return (
    <>
      {hero ? (
        <div data-portal-hero>
          <Photo
            photo={toPhoto(hero)}
            sizes="100vw"
            priority
            shutter
            scrim={["bottom", "bottom", "top"]}
            className="h-[68svh] min-h-[440px] md:h-[min(80svh,760px)]"
            overlayClassName="flex-col"
          >
            <div className="pk-frame pt-[72px] md:pt-[104px]">{backLink(true)}</div>
            <div className="pk-frame mt-auto pb-8 md:pb-14">{title}</div>
          </Photo>
        </div>
      ) : (
        <section className="pk-night relative pb-12 pt-6 md:pb-20 md:pt-10">
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-gold-500" />
          <div className="pk-frame">
            {backLink(false)}
            <div className="mt-8 md:mt-14">{title}</div>
          </div>
        </section>
      )}

      <ChoosingBanner context={context} />

      <div className="pk-frame">
        {place.photos.length > (hero ? 1 : 0) && (
          <section aria-label={`Photographs of ${place.name}`} className="mt-2 md:mt-3">
            <Suspense fallback={null}>
              <PlaceGallery photos={place.photos} name={place.name} skip={hero ? 1 : 0} />
            </Suspense>
          </section>
        )}

        <div className="mt-12 grid gap-x-16 gap-y-12 md:mt-20 md:grid-cols-12 md:grid-rows-[auto_1fr]">
          <div className="md:col-span-7">
            <InTrip days={days} className="mb-5" />
            {place.description && <p className="text-[20px] leading-[1.6] text-pretty md:text-[22px]">{place.description}</p>}
            {facts.length > 0 && (
              <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-paper-line pt-6">
                {facts.map((f) => (
                  <div key={f.label} className="flex flex-col-reverse">
                    <dt className="pk-label mt-2">{f.label}</dt>
                    <dd className="pk-numeral pk-numeral-sm">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <aside className="md:col-span-5 md:col-start-8 md:row-span-2 md:row-start-1" aria-labelledby="here-title">
            <div className="md:sticky md:top-28">
              {place.experiences.length > 0 ? (
                <>
                  <h2 id="here-title" className="pk-h2">
                    What you can do here
                  </h2>
                  <p className="mt-3 text-[17px] text-mist-muted">
                    {pluralise(place.experiences.length, "experience")}
                    {context.trip?.editable ? " · open one to choose a day" : ""}
                  </p>
                  <Suspense fallback={null}>
                    <PlaceExperiences place={place} context={context} />
                  </Suspense>
                </>
              ) : (
                <div className="relative border border-paper-line bg-paper-raised p-6 md:p-8">
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gold-500" />
                  <h2 id="here-title" className="pk-h3">
                    Visiting {place.name}
                  </h2>
                  <p className="mt-3 text-[18px] leading-relaxed text-mist-muted">
                    Nothing here is set up to add on your own yet. {context.coordinator === "your coordinator" ? "Your coordinator" : context.coordinator} can
                    arrange a visit and tell you what is possible.
                  </p>
                  <div className="mt-6">
                    {context.trip ? (
                      <Suspense fallback={null}>
                        <AskForm tripId={context.trip.id} vendorSlug={place.slug}>
                          Ask {context.coordinator} to arrange a visit
                        </AskForm>
                      </Suspense>
                    ) : (
                      <AppLink href={`/trip/chat?about=${encodeURIComponent(place.name)}`} className={buttonClass("primary")}>
                        Ask us about a visit
                      </AppLink>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {(place.highlights.length > 0 || place.accreditations.length > 0 || place.languages.length > 0 || place.locations.length > 0) && (
            <div className="space-y-10 md:col-span-7">
              {place.highlights.length > 0 && (
                <section>
                  <h2 className="pk-h3">At a glance</h2>
                  <ul className="mt-4 border-t border-paper-line">
                    {place.highlights.map((h) => (
                      <li key={h} className="flex gap-4 border-b border-paper-line py-4 text-[18px] leading-relaxed">
                        <span aria-hidden="true" className="mt-[0.85em] h-px w-5 shrink-0 bg-gold-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {place.accreditations.length > 0 && <Facts title="Accreditations" items={place.accreditations} />}
              {place.languages.length > 0 && <Facts title="Languages" items={[place.languages.join(", ")]} />}
              {place.locations.length > 0 && <Facts title={place.locations.length > 1 ? "Locations" : "Location"} items={place.locations} />}
            </div>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <ExploreToasts added={added} coordinator={context.coordinator} />
      </Suspense>
    </>
  );
}

function Facts({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="pk-h3">{title}</h2>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i} className="text-[18px] leading-relaxed text-mist-muted">
            {i}
          </li>
        ))}
      </ul>
    </section>
  );
}
