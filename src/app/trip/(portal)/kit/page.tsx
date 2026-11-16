import type { Metadata } from "next";
import { PHOTOS } from "@/app/(site)/content";
import {
  BigNumeral,
  Button,
  ButtonLink,
  Chip,
  Countdown,
  DayThumb,
  Gallery,
  ModuleDot,
  Pass,
  PassStrip,
  Photo,
  SectionHeading,
  StatusMark,
  Stepper,
  StickyBar,
  Tabular,
  Toast,
  countdownParts,
  keralaMidnight,
  type PhotoSource,
} from "@/components/portal/kit";
import { cn, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Portal kit" };

// Preview of every kit component in its states, on paper and on night.
// Behind client sign-in, not linked anywhere. Delete before release.

const SWATCHES = [
  ["night", "#0e1518", "bg-night"],
  ["night-raised", "#172126", "bg-night-raised"],
  ["night-ink", "#edeeea", "bg-night-ink"],
  ["night-muted", "#a3adaa", "bg-night-muted"],
  ["paper", "#f7f3ea", "bg-paper"],
  ["paper-raised", "#fffdf8", "bg-paper-raised"],
  ["paper-line", "#e2d8c2", "bg-paper-line"],
  ["mist-ink", "#11181b", "bg-mist-ink"],
  ["mist-muted", "#4e5a57", "bg-mist-muted"],
  ["brass", "#cfab70", "bg-brass"],
  ["gold-500", "#b08a3e", "bg-gold-500"],
  ["gold-700", "#7a5c1e", "bg-gold-700"],
  ["lagoon-600", "#1f6670", "bg-lagoon-600"],
  ["leaf-600", "#3f6d2b", "bg-leaf-600"],
  ["laterite-600", "#a2482e", "bg-laterite-600"],
  ["success-600", "#35704a", "bg-success-600"],
] as const;

const GALLERY: PhotoSource[] = [PHOTOS.treatmentRoom, PHOTOS.dhara, PHOTOS.mortar, PHOTOS.coast, PHOTOS.palms];

const DAYS = [
  { photo: PHOTOS.check, state: "booked" },
  { photo: PHOTOS.heart, state: "booked" },
  { photo: PHOTOS.dhara, state: "planned" },
  { photo: null, state: "free" },
  { photo: null, state: "free" },
  { photo: PHOTOS.kathakali, state: "planned" },
  { photo: null, state: "free" },
  { photo: PHOTOS.houseboat, state: "planned" },
  { photo: null, state: "free" },
  { photo: null, state: "free" },
] as const;

function Block({ title, children, night }: { title: string; children: React.ReactNode; night?: boolean }) {
  return (
    <section className={cn(night ? "pk-night" : "pk-paper", "py-14 md:py-20")}>
      <div className="pk-frame">
        <h2 className="pk-label mb-8 border-b border-(--pk-line) pb-3">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Buttons() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button>Plan my days →</Button>
      <Button variant="secondary">Review and confirm</Button>
      <Button variant="quiet">Open Day 1 in full</Button>
      <Button disabled>Disabled</Button>
    </div>
  );
}

function Marks() {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[17px]">
      <ModuleDot kind="health" />
      <ModuleDot kind="wellness" />
      <ModuleDot kind="culture" />
      <ModuleDot moduleName="Wellness & Spa" label="Kaumudi Ayurveda Retreat · Varkala" className="text-(--pk-muted)" />
    </div>
  );
}

export default async function KitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const day = Math.min(Math.max(Number(param(query, "day")) || 1, 1), DAYS.length);
  // ?plain=1 drops the hero marker, to see the solid header a page without a hero gets.
  const plain = param(query, "plain") === "1";
  const target = keralaMidnight("2026-12-18");
  const parts = countdownParts(target, Date.now());
  const current = DAYS[day - 1];

  return (
    <div>
      {/* Hero composition: what My trip's first viewport is built from. */}
      <section data-portal-hero={plain ? undefined : true} aria-label="Hero example">
        <Photo
          photo={PHOTOS.lake}
          sizes="100vw"
          priority
          shutter
          scrim={["bottom", "right"]}
          className="h-[72svh] md:h-[min(78svh,760px)]"
          overlayClassName="items-end"
        >
          <div className="pk-frame flex items-end justify-between gap-6 pb-14 md:pb-24">
            <div className="max-md:hidden">
              <p className="text-[19px] font-medium">Hello, Elena</p>
              <p className="text-[19px]">18 – 27 December 2026</p>
            </div>
            <div className="ml-auto flex flex-col items-end text-right">
              <BigNumeral value={parts.days} label="days to go" size="hero" align="end" settle />
              <span className="my-5 h-px w-30 bg-gold-300" aria-hidden="true" />
              <Countdown target={target} initial={parts} prefix="and" className="text-[22px] md:text-[28px]" />
              <span className="mt-1 text-[16px] text-night-muted">until Day 1 begins, Kerala time</span>
            </div>
          </div>
        </Photo>
        <div className="pk-frame relative -mt-8 md:-mt-16">
          <Pass>
            <h1 className="font-display text-[30px] leading-[1.05] tracking-[-0.015em] text-balance md:text-[44px]">
              Ten days in Kerala: a health baseline, Ayurveda and the backwaters
            </h1>
            <PassStrip
              className="mt-8"
              cells={[
                { value: "1", label: "Traveller" },
                { value: "10", label: "Days" },
                { value: "€955", label: "Total so far" },
              ]}
              action={
                <div className="flex flex-col items-stretch gap-1 md:items-center">
                  <ButtonLink href="/trip/itinerary">
                    Plan my days →
                  </ButtonLink>
                  <ButtonLink href="/trip/itinerary/confirm" variant="quiet" className="self-center">
                    Review and confirm
                  </ButtonLink>
                </div>
              }
            />
          </Pass>
        </div>
      </section>

      <Block title="Type scale (paper)">
        <div className="space-y-8">
          <p className="pk-h1">Explore Kerala — H1, Gambarino 40 → 72</p>
          <p className="pk-h2">Step through your days — H2, 32 → 44</p>
          <p className="pk-h3">Comprehensive Blood Panel — H3, General Sans 500, 21–22</p>
          <p className="pk-body pk-read">
            Body, General Sans 400 at 18 px on phones and 19 px on desktop, line-height 1.6, at most 68 characters a line.
            Your team has arranged your health appointments; add anything else you would like, then confirm.
          </p>
          <p className="pk-label">Label, 16 px 500, muted, sentence case</p>
          <p className="pk-time">09:00 – 10:30 · 11:11 · 14 h 05 min</p>
          <div className="flex flex-wrap items-end gap-x-12 gap-y-8">
            <BigNumeral value="32" label="hero 120–220" size="hero" />
            <BigNumeral value="4" label="day 88 / 120" size="day" />
            <BigNumeral value="€969" label="stat 44 / 72" size="stat" />
            <BigNumeral value="€85" label="sm 32" size="sm" />
          </div>
          <div className="pk-numeral overflow-hidden text-[64px] md:text-[160px]" aria-hidden="true">0123456789</div>
          <div className="pk-time text-[28px]" aria-hidden="true">
            <div><Tabular>1111 h 11 min</Tabular> (Tabular cells)</div>
            <div><Tabular>0000 h 00 min</Tabular></div>
            <div className="text-mist-muted">1111 h 11 min (plain: General Sans has no tnum)</div>
          </div>
        </div>
      </Block>

      <Block title="Tokens">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {SWATCHES.map(([name, hex, bg]) => (
            <li key={name}>
              <span className={cn("block aspect-square border border-paper-line", bg)} />
              <span className="mt-2 block text-[15px] font-medium">{name}</span>
              <span className="block text-[15px] text-mist-muted">{hex}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Buttons, modules and status (paper)">
        <div className="space-y-10">
          <Buttons />
          <Marks />
          <div className="flex flex-wrap items-center gap-8">
            <StatusMark progress="booked" />
            <StatusMark progress="confirmed" />
            <StatusMark progress="planned" addedBy="TEAM" />
            <StatusMark progress="planned" addedBy="AI" />
          </div>
          <SectionHeading
            title="Wellness"
            label="Section heading"
            lead="Ayurveda retreats and quiet places to rest, chosen by your team."
            action={<ButtonLink href="/trip/explore" variant="secondary">See all 6 wellness places</ButtonLink>}
          />
        </div>
      </Block>

      <Block title="Buttons and modules (night)" night>
        <div className="space-y-10">
          <Buttons />
          <Marks />
          <div className="flex flex-wrap gap-3">
            <Chip pressed>All 18</Chip>
            <Chip pressed={false} kind="health" count={5}>Health</Chip>
            <Chip pressed={false} kind="wellness" count={6}>Wellness</Chip>
          </div>
        </div>
      </Block>

      <Block title="Chips, stepper and day rail (paper)">
        <div className="space-y-10">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
            <Chip pressed>All 18</Chip>
            <Chip pressed={false} kind="health" count={5}>Health</Chip>
            <Chip pressed={false} kind="wellness" count={6}>Wellness</Chip>
            <Chip pressed={false} kind="culture" count={7}>Culture</Chip>
          </div>
          <div className="grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12">
            <Photo
              photo={current.photo}
              ratio="16/9"
              sizes="(min-width: 768px) 58vw, 100vw"
              fallback={{ title: `Day ${day} is free`, line: "Rest, or add something you would like." }}
            />
            <div>
              <p className="flex items-baseline gap-4">
                <span className="pk-numeral text-[64px] md:text-[96px]">Day {day}</span>
                <span className="text-[19px] text-mist-muted">of 10</span>
              </p>
              <p className="mt-4 text-[19px]">Friday 18 December</p>
              <Stepper
                className="mt-8"
                prev={{ label: "Previous day", href: `?day=${day - 1}`, disabled: day === 1 }}
                next={{ label: "Next day", href: `?day=${day + 1}`, disabled: day === DAYS.length }}
              />
              <Stepper
                compact
                className="mt-6 border border-paper-line bg-paper-raised px-2 py-1"
                prev={{ label: "Previous day", href: `?day=${day - 1}`, disabled: day === 1 }}
                next={{ label: "Next day", href: `?day=${day + 1}`, disabled: day === DAYS.length }}
              >
                <span className="text-[17px] font-medium">Day {day} of 10 · Fri 18 Dec</span>
              </Stepper>
            </div>
          </div>
          <ol className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 py-2 min-[390px]:-mx-5 min-[390px]:px-5 md:mx-0 md:px-2">
            {DAYS.map((d, i) => (
              <li key={i} className="snap-start">
                <DayThumb day={i + 1} dateLabel={`${18 + i} Dec`} photo={d.photo} state={d.state} current={i + 1 === day} href={`?day=${i + 1}`} />
              </li>
            ))}
          </ol>
        </div>
      </Block>

      <Block title="Passes: booked, being booked, stub positions">
        <div className="grid gap-10">
          <Pass
            stamp
            stub={
              <div className="flex h-full flex-col justify-between gap-3">
                <span className="pk-time">09:00</span>
                <StatusMark progress="booked" />
                <span className="text-[16px] text-mist-muted">2 travellers</span>
              </div>
            }
          >
            <ModuleDot kind="health" className="text-[16px] text-mist-muted" />
            <p className="pk-h3 mt-2">Cardiac Health Assessment</p>
            <p className="mt-1 text-[17px] text-mist-muted">Fort Kochi · Backwater Diagnostics Centre (demo)</p>
            <p className="mt-1 text-[17px] text-mist-muted">1 h 30 min · €590 for 2 travellers</p>
          </Pass>
          <Pass
            state="pending"
            stub={
              <div className="flex h-full flex-col justify-between gap-3">
                <span className="pk-time">19:30</span>
                <StatusMark progress="confirmed" />
              </div>
            }
          >
            <ModuleDot kind="culture" className="text-[16px] text-mist-muted" />
            <p className="pk-h3 mt-2">Candlelit Courtyard Dinner</p>
            <p className="mt-1 text-[17px] text-mist-muted">Kochi · Malabar Spice Table (demo)</p>
          </Pass>
          <div className="grid gap-10 md:grid-cols-2">
            <Pass stubAt="right" kasavu={false} stub={<span className="pk-time">17:30</span>}>
              <p className="pk-h3">Kathakali, stub right</p>
            </Pass>
            <Pass stubAt="bottom" stub={<StatusMark progress="booked" />}>
              <p className="pk-h3">Backwater cruise, stub bottom</p>
            </Pass>
          </div>
        </div>
      </Block>

      <Block title="Pass on night" night>
        <Pass stub={<span className="pk-time">08:00</span>}>
          <p className="pk-h3">Comprehensive Blood Panel</p>
          <p className="mt-1 text-[17px] text-mist-muted">Notches show the night ground through.</p>
        </Pass>
      </Block>

      <Block title="Photos: ratios, scrim with type, no-photo card, unknown host">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Photo photo={PHOTOS.kathakali} ratio="4/5" sizes="(min-width: 768px) 25vw, 50vw" zoom scrim="bottom" overlayClassName="items-end p-4">
            <span className="font-display text-[28px] leading-none">Kathakali</span>
          </Photo>
          <Photo photo={PHOTOS.houseboat} ratio="4/5" sizes="(min-width: 768px) 25vw, 50vw" reveal />
          <Photo ratio="4/5" sizes="25vw" fallback={{ title: "Nila Speciality Clinic (demo)", kind: "health", line: "Photographs to come" }} />
          <Photo photo={PHOTOS.nets} ratio="4/5" sizes="(min-width: 768px) 25vw, 50vw" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Photo photo={PHOTOS.coast} ratio="3/2" sizes="(min-width: 768px) 33vw, 100vw" />
          <Photo photo={PHOTOS.tea} ratio="16/9" sizes="(min-width: 768px) 33vw, 100vw" />
          <Photo photo={PHOTOS.sadya} ratio="1/1" sizes="(min-width: 768px) 33vw, 100vw" />
        </div>
      </Block>

      <Block title="Gallery and lightbox">
        <Gallery photos={GALLERY} name="Kaumudi Ayurveda Retreat (demo)" kind="wellness" />
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <Gallery photos={GALLERY.slice(0, 2)} name="Two photos" panelKey="photo2" />
          <Gallery photos={[]} name="Thekkady Trail Guides (demo)" kind="culture" />
        </div>
      </Block>

      <Block title="Sticky bar and toast">
        <p className="pk-body pk-read">
          The bar below sits above the tab bar on phones and sticks to the bottom of the column on desktop.{" "}
          <a href="?done=added" className="underline underline-offset-4">Show the toast</a>.
        </p>
        <StickyBar>
          <span className="flex flex-col">
            <span className="pk-numeral text-[32px]">€955</span>
            <span className="text-[15px] text-mist-muted">4 activities, so far</span>
          </span>
          <ButtonLink href="/trip/itinerary/confirm">Review and confirm</ButtonLink>
        </StickyBar>
        <Toast
          aboveBar
          messages={{ added: "Added to Day 4, 10:00" }}
          undo={{ added: <a href="?" className="inline-flex min-h-12 items-center px-2 text-[17px] font-medium text-brass underline underline-offset-4">Undo</a> }}
        />
      </Block>
    </div>
  );
}
