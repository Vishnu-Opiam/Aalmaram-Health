import { ArrowRight } from "lucide-react";
import { ButtonLink, DayThumb, ModuleDot, Photo, SectionHeading, StatusMark, Stepper, Tabular, type PhotoSource } from "@/components/portal/kit";
import { dayPhotos } from "@/components/portal/days/plan";
import type { BuilderDay, BuilderTrip } from "@/domain/trips/builder-view";
import { dayDate, dayState } from "./moment";

/**
 * "Your days": one day in focus (photo, "Day 3 of 10", up to three items),
 * ‹ › to step, and a rail of every day. The day lives in `?day=<YYYY-MM-DD>`,
 * so every step is a plain link: it works without JavaScript, Back works, and
 * a day can be shared. Each day opens in Day by day at the same key.
 */
export function DayStepper({
  trip,
  focusKey,
  contact,
}: {
  trip: BuilderTrip;
  focusKey: string;
  contact: string;
}) {
  const days = trip.days;
  const index = Math.max(0, days.findIndex((d) => d.key === focusKey));
  const day = days[index];
  const q = `trip=${encodeURIComponent(trip.id)}`;
  const here = (key: string) => `/trip?${q}&day=${key}#your-days`;
  const full = (key: string, extra = "") => `/trip/itinerary?${q}&day=${key}${extra}#day-${key}`;
  const weekday = dayDate(day.key).split(" ")[0];
  const shown = day.blocks.slice(0, 3);
  const free = day.blocks.length === 0;
  const photos = dayPhotos(trip);
  const photo = photos[index];

  return (
    <section id="your-days" aria-labelledby="days-heading" className="pk-frame pk-section scroll-mt-24">
      <SectionHeading
        id="days-heading"
        title="Your days"
        action={
          <ButtonLink href={`/trip/itinerary?${q}`} variant="quiet">
            See all {days.length} days
          </ButtonLink>
        }
      />

      <div className="mt-8 grid gap-6 md:mt-12 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12">
        <Photo
          photo={photo}
          ratio="4/3"
          className="md:aspect-auto md:min-h-[440px]"
          sizes="(min-width: 768px) 58vw, 100vw"
          scrim={free ? "bottom" : undefined}
          overlayClassName="items-end p-5 md:p-7"
        >
          {free ? <span className="font-display text-[28px] leading-none md:text-[36px]">A free day</span> : undefined}
        </Photo>

        <div className="flex min-w-0 flex-col">
          <p className="flex items-baseline gap-3">
            <span className="pk-numeral pk-numeral-day whitespace-nowrap">Day {day.dayNumber}</span>
            <span className="text-[19px] text-mist-muted md:text-[22px]">of {days.length}</span>
          </p>
          <p className="mt-4 text-[19px] md:text-[20px]">{dayDate(day.key)}</p>

          {free ? (
            <p className="pk-body mt-6 border-t border-paper-line pt-5 text-mist-muted">
              Nothing planned yet. Rest, wander, or {trip.editable ? "add something you'd enjoy." : `ask ${contact} to arrange something.`}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-paper-line border-y border-paper-line">
              {shown.map((b) => (
                <li key={b.id} className="flex gap-4 py-4">
                  <span className="pk-time w-[3.6em] shrink-0 pt-0.5 text-[19px] md:text-[20px]">
                    <Tabular>{b.time}</Tabular>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[19px] font-medium leading-snug">{b.title}</span>
                    <ModuleDot
                      moduleName={b.moduleName}
                      label={[b.branchLabel ?? b.place.city, b.place.name].filter(Boolean).join(" · ")}
                      className="mt-1 items-start text-[16px] text-mist-muted [&>span:first-child]:mt-[0.6em]"
                    />
                    <StatusMark progress={b.progress} addedBy={b.addedBy} className="mt-2.5 flex w-fit" />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {day.blocks.length > shown.length && (
            <p className="mt-3 text-[16px] text-mist-muted">And {day.blocks.length - shown.length} more on this day</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            {free && trip.editable ? (
              <ButtonLink href={full(day.key, `&add=${day.key}`)} variant="secondary">
                Add something to {weekday}
              </ButtonLink>
            ) : (
              <ButtonLink href={full(day.key)} variant="secondary">
                Open Day {day.dayNumber} in full <ArrowRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </ButtonLink>
            )}
          </div>

          <Stepper
            className="mt-auto pt-8"
            prev={{ label: index > 0 ? `Day ${index}` : "Previous day", href: index > 0 ? here(days[index - 1].key) : undefined, disabled: index === 0 }}
            next={{ label: index < days.length - 1 ? `Day ${index + 2}` : "Next day", href: index < days.length - 1 ? here(days[index + 1].key) : undefined, disabled: index === days.length - 1 }}
          />
        </div>
      </div>

      <DayRail days={days} photos={photos} current={day.key} href={here} />
    </section>
  );
}

function DayRail({ days, photos, current, href }: { days: BuilderDay[]; photos: PhotoSource[]; current: string; href: (key: string) => string }) {
  return (
    <ol aria-label="Every day of your trip" className="-mx-4 mt-8 flex snap-x gap-3 overflow-x-auto px-4 py-3 min-[390px]:-mx-5 min-[390px]:px-5 md:mx-0 md:mt-10 md:flex-wrap md:px-2">
      {days.map((d, i) => {
        const state = dayState(d.blocks);
        return (
          <li key={d.key} className="snap-start">
            <DayThumb
              day={d.dayNumber}
              dateLabel={dayDate(d.key)}
              photo={state === "free" ? null : photos[i]}
              state={state}
              current={d.key === current}
              href={href(d.key)}
            />
            <span className="mt-1.5 block text-center text-[15px] text-mist-muted" aria-hidden="true">
              {dayDate(d.key, true).split(" ")[0]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
