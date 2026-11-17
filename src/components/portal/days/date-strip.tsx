"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { Stepper } from "@/components/portal/kit/controls";
import { cn } from "@/lib/utils";
import { longDay, type DayState } from "./plan";

export type StripDay = { key: string; dayNumber: number; state: DayState };
export const ALL = "all";

const STATE_WORDS: Record<DayState, string> = { free: "free", planned: "planned", booked: "booked" };
const short = (key: string, o: Intl.DateTimeFormatOptions) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });

/**
 * The sticky row of days under the header: one chip per day (weekday, date and
 * a mark: ring = free, dot = planned, green tick = booked), "Whole trip" last,
 * ‹ › at the ends. Chips are real links (`?day=`), so it works without
 * JavaScript; with it, `onSelect` switches in place. The chosen chip is kept
 * in view however long the trip.
 */
export function DateStrip({
  days,
  selected,
  todayKey,
  href,
  onSelect,
}: {
  days: StripDay[];
  /** A day key, or ALL for the whole-trip view. */
  selected: string;
  todayKey: string | null;
  href: (key: string) => string;
  onSelect: (key: string) => void;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const index = days.findIndex((d) => d.key === selected);

  useEffect(() => {
    const r = rail.current;
    const chip = r?.querySelector<HTMLElement>("[aria-current]");
    if (!r || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    r.scrollTo({ left: chip.offsetLeft - (r.clientWidth - chip.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [selected]);

  const follow = (key: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelect(key);
  };

  const all = selected === ALL;
  const prev = all ? days.at(-1)! : index > 0 ? days[index - 1] : null;
  const next = !all && index < days.length - 1 ? days[index + 1] : null;

  return (
    <nav aria-label="Your days" className="sticky top-0 z-30 border-b border-paper-line bg-paper md:top-18">
      <Stepper
        compact
        className="pk-frame gap-1.5 py-2 md:gap-3"
        prev={
          prev
            ? { label: `Previous day: Day ${prev.dayNumber}`, onClick: () => onSelect(prev.key) }
            : { label: "Previous day", disabled: true }
        }
        next={
          next
            ? { label: `Next day: Day ${next.dayNumber}`, onClick: () => onSelect(next.key) }
            : all
              ? { label: "Next day", disabled: true }
              : { label: "The whole trip", onClick: () => onSelect(ALL) }
        }
      >
        {/* Phones: exactly four chips between the buttons, snapping chip by chip, so none rests cut in half. */}
        <ul
          ref={rail}
          className="relative grid snap-x snap-mandatory scroll-px-1 auto-cols-[calc((100%-3*0.375rem)/4)] grid-flow-col gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] md:flex md:gap-2 [&::-webkit-scrollbar]:hidden"
        >
          {days.map((d) => {
            const current = d.key === selected;
            const today = d.key === todayKey;
            return (
              <li key={d.key} className="flex snap-start">
                <a
                  href={href(d.key)}
                  onClick={follow(d.key)}
                  aria-current={current ? "date" : undefined}
                  className={cn(chip, "w-full md:w-16", current ? on : off)}
                >
                  <span aria-hidden="true" className={cn("text-[15px] leading-none", current ? "text-paper/80" : today ? "font-medium text-gold-700" : "text-mist-muted")}>
                    {today ? "Today" : short(d.key, { weekday: "short" })}
                  </span>
                  <span aria-hidden="true" className="pk-numeral text-[30px]">
                    {short(d.key, { day: "numeric" })}
                  </span>
                  <Mark state={d.state} current={current} />
                  <span className="sr-only">
                    Day {d.dayNumber}, {longDay(d.key)}
                    {today ? ", today" : ""}, {STATE_WORDS[d.state]}
                  </span>
                </a>
              </li>
            );
          })}
          <li aria-hidden="true" className="mx-1 w-px shrink-0 self-stretch bg-paper-line max-md:hidden" />
          <li className="flex snap-start">
            <a
              href={href(ALL)}
              onClick={follow(ALL)}
              aria-current={selected === ALL ? "page" : undefined}
              className={cn(chip, "w-full text-[15px] font-medium leading-tight md:w-[4.5rem]", selected === ALL ? on : off)}
            >
              Whole
              <br />
              trip
            </a>
          </li>
        </ul>
      </Stepper>
    </nav>
  );
}

const chip =
  "flex h-[5.25rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-full border text-center transition-colors duration-200";
const on = "border-mist-ink bg-mist-ink text-paper";
const off = "border-paper-line bg-paper-raised text-mist-ink hover:border-mist-ink";

function Mark({ state, current }: { state: DayState; current: boolean }) {
  if (state === "booked")
    return (
      <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success-600 text-white">
        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
      </span>
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-2 w-2 rounded-full",
        state === "planned" ? (current ? "bg-paper" : "bg-mist-ink") : current ? "border border-paper/70" : "border border-mist-muted",
      )}
    />
  );
}
