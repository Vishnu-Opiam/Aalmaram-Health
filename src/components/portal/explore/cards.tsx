import { AppLink } from "@/components/ui/primitives";
import { ModuleDot, Photo } from "@/components/portal/kit";
import { formatDuration } from "@/domain/vendors/profile";
import type { LibraryComponent, Place } from "@/domain/trips/builder-view";
import { cn, pluralise } from "@/lib/utils";
import { daysLabel, heroOf, insetOf, money, placeKind, toPhoto } from "./model";

/** "Ayurveda Hospital (Kottakkal)" in Kottakkal → "Ayurveda hospital": no town said twice. */
export function typeLine(place: Pick<Place, "typeLabel" | "city">) {
  const type = place.typeLabel?.replace(/\s*\(([^)]+)\)\s*$/, (m, inner: string) => (place.city?.includes(inner) ? "" : m)) ?? null;
  return [type, place.city].filter(Boolean).join(" · ");
}

/** "In your trip · Day 4", with the gold thread: the one mark for "already chosen". */
export function InTrip({ days, className }: { days: number[] | undefined; className?: string }) {
  if (!days?.length) return null;
  return (
    <p className={cn("flex items-center gap-2.5 text-[16px] font-medium text-gold-700", className)}>
      <span aria-hidden="true" className="h-px w-6 bg-gold-500" />
      In your trip · {daysLabel(days)}
    </p>
  );
}

/**
 * The typographic face for a place without a photo that can lead a card:
 * name in Gambarino, module and type above, the gold thread. When the place
 * has a smaller real photo (a 1000 px panorama, a square) it sits inside as
 * an inset at its own shape, never stretched. Two grounds alternate so a run
 * of them reads as a set, not as missing images.
 */
export function TypeFace({
  place,
  tone = "night",
  className,
  big,
}: {
  place: Pick<Place, "name" | "module" | "photos" | "highlights" | "description">;
  tone?: "night" | "paper";
  className?: string;
  big?: boolean;
}) {
  const kind = placeKind(place);
  const inset = insetOf(place);
  // Without a photo, a line of its own profile fills the card: a fact, never a slogan.
  const line = inset ? null : (place.description?.split(/(?<=\.)\s+(?=[A-Z])/)[0] ?? place.highlights[0] ?? null);
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden p-4 min-[390px]:p-5 md:p-6",
        tone === "night" ? "pk-night" : "pk-on-paper border border-paper-line bg-paper-raised text-mist-ink",
        className,
      )}
    >
      {/* The kasavu band: the gold thread along the top edge. */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gold-500" />
      <span aria-hidden="true" className="absolute inset-x-0 top-[6px] h-px bg-gold-500/60" />
      {/* Type and town sit under the card, so the face keeps to the module and the name. */}
      {kind && <ModuleDot kind={kind} className="pt-2 text-[15px] font-medium text-(--pk-muted) md:text-[16px]" />}
      {inset && (
        <div className="relative mt-4 max-h-[42%] min-h-8 w-full shrink md:mt-5" style={{ aspectRatio: `${Math.max(inset.width / inset.height, 1)}` }}>
          <Photo photo={toPhoto(inset)} sizes="(min-width: 768px) 30vw, 45vw" className="h-full" />
        </div>
      )}
      {line && (
        <p className={cn("mt-4 line-clamp-3 min-h-0 shrink overflow-hidden text-[15px] leading-snug text-(--pk-muted) md:mt-6 md:line-clamp-4 md:text-[17px]", big && "md:max-w-[28rem] md:text-[19px]")}>
          {line}
        </p>
      )}
      <p
        className={cn(
          "mt-auto shrink-0 pt-4 font-display leading-[1.02] tracking-[-0.015em] text-balance md:pt-6",
          big ? "text-[36px] md:text-[56px]" : place.name.length > 34 ? "text-[19px] md:text-[26px]" : "text-[22px] md:text-[32px]",
        )}
      >
        {place.name}
      </p>
    </div>
  );
}

/**
 * A place in the grid: a 4:5 photograph (or the typographic face) with the
 * name, type and town on paper below — never on the photo. `lead` makes it the
 * large first card of its module (two columns and two rows from md).
 */
export function PlaceCard({
  place,
  href,
  days,
  lead,
  tone,
  priority,
}: {
  place: Place;
  href: string;
  days?: number[];
  lead?: boolean;
  tone?: "night" | "paper";
  priority?: boolean;
}) {
  const hero = heroOf(place);
  const meta = typeLine(place);
  const count = place.experiences.length;
  // The lead spans two columns at the height of a 4:5 card beside it (2w + gap : 1.25w ≈ 33:20).
  const face = cn("w-full", lead ? "aspect-[4/5] md:aspect-[33/20]" : "aspect-[4/5]");
  return (
    <li className={cn("flex flex-col", lead && "col-span-2")}>
      <AppLink
        href={href}
        className="group flex flex-1 flex-col"
        aria-label={[place.name, meta, days?.length ? `in your trip, ${daysLabel(days)}` : ""].filter(Boolean).join(", ")}
      >
        {hero ? (
          <Photo
            photo={toPhoto(hero)}
            sizes={lead ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 50vw"}
            priority={priority}
            zoom
            className={face}
          />
        ) : (
          <TypeFace place={place} tone={tone} big={lead} className={face} />
        )}
        <span className="mt-3 block md:mt-4">
          {hero && (
            <span
              className={cn(
                "block font-display leading-[1.08] tracking-[-0.01em] text-mist-ink decoration-1 underline-offset-[5px] group-hover:underline",
                lead ? "text-[28px] md:text-[34px]" : "text-[22px] md:text-[26px]",
              )}
            >
              {place.name}
            </span>
          )}
          {meta && <span className={cn("block text-[16px] leading-snug text-mist-muted", hero && "mt-1")}>{meta}</span>}
          {count > 0 && (
            <span className="mt-1 block text-[16px] text-mist-ink">
              {pluralise(count, "experience")}
              {place.fromPrice && ` · from ${money(place.fromPrice.amount, place.fromPrice.currency)}`}
            </span>
          )}
        </span>
        <InTrip days={days} className="mt-2" />
      </AppLink>
    </li>
  );
}

/**
 * An experience: its place's photograph, the title, place and town, then
 * duration and price. A button: it opens the details panel (`?item=`).
 * Phones get a row with a square thumbnail; from md a 3:2 card.
 */
export function ExperienceCard({
  item,
  photo,
  days,
  onOpen,
  showPlace = true,
  row,
}: {
  item: LibraryComponent;
  photo: Parameters<typeof toPhoto>[0] | null;
  days?: number[];
  onOpen: () => void;
  showPlace?: boolean;
  /** Always a row with a thumbnail (the place page's side column). */
  row?: boolean;
}) {
  const kind = placeKind({ module: item.moduleName });
  return (
    <li id={`exp-${item.id}`} className="scroll-mt-28">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${item.name}. Open details`}
        className={cn(
          "group grid w-full grid-cols-[112px_1fr] items-start gap-4 text-left",
          row ? "md:grid-cols-[148px_1fr] md:gap-5" : "md:grid-cols-1 md:gap-0",
        )}
      >
        {photo ? (
          <Photo
            photo={toPhoto(photo)}
            sizes={row ? "(min-width: 768px) 148px, 112px" : "(min-width: 768px) 33vw, 112px"}
            zoom
            className={row ? "aspect-square" : "aspect-square md:aspect-[3/2]"}
          />
        ) : (
          <span className={cn("pk-night relative flex aspect-square flex-col justify-end p-3", !row && "md:aspect-[3/2] md:p-6")}>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gold-500" />
            {!row && <span className="hidden font-display text-[28px] leading-[1.05] text-balance md:block">{item.place.name}</span>}
            {kind && <ModuleDot kind={kind} label="" className={row ? undefined : "md:hidden"} />}
          </span>
        )}
        <span className={cn("block min-w-0", !row && "md:mt-4")}>
          {kind && showPlace && (
            <ModuleDot kind={kind} label={item.place.name} className="mb-1 text-[15px] font-medium text-mist-muted md:text-[16px]" />
          )}
          <span className="block text-[19px] font-medium leading-snug text-mist-ink decoration-1 underline-offset-[5px] group-hover:underline md:text-[21px]">
            {item.name}
          </span>
          <span className="mt-1 block text-[16px] text-mist-muted">
            {formatDuration(item.durationMinutes)} ·{" "}
            <span className="text-mist-ink">
              {money(item.price, item.currency)} {item.priceUnitLabel}
            </span>
          </span>
          <InTrip days={days} className="mt-1.5" />
        </span>
      </button>
    </li>
  );
}
