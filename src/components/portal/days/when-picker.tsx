"use client";

import { Check, TriangleAlert } from "lucide-react";
import { Tabular } from "@/components/portal/kit/tabular";
import type { BuilderTrip } from "@/domain/trips/builder-view";
import { cn } from "@/lib/utils";
import { fits, toMin, toTime } from "./plan";

const PARTS = [
  { label: "Morning", time: "09:00" },
  { label: "Afternoon", time: "14:00" },
  { label: "Evening", time: "18:30" },
];

/**
 * What time? The free slot that was tapped, morning / afternoon / evening,
 * or an exact time. Each choice says whether it fits around what is already
 * on that day, and the line under it says where it ends — so nobody adds an
 * eight-hour cruise at half past one by accident.
 */
export function WhenPicker({
  trip,
  dayKey,
  time,
  onTime,
  item,
  ignoreId,
  slot,
  form,
}: {
  trip: BuilderTrip;
  dayKey: string;
  time: string;
  onTime: (time: string) => void;
  item: { durationMinutes: number; title?: string };
  ignoreId?: string;
  /** The free slot the client came from, offered first. */
  slot?: string | null;
  /** The form the time input belongs to, when it sits outside it. */
  form?: string;
}) {
  const day = trip.days.find((d) => d.key === dayKey);
  const choices = [...(slot && !PARTS.some((p) => p.time === slot) ? [{ label: "Your free time", time: slot }] : []), ...PARTS];
  const multiDay = item.durationMinutes >= 24 * 60;

  return (
    <fieldset>
      <legend className="text-[19px] font-medium">What time?</legend>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {choices.map((c) => {
          const ok = fits(trip, dayKey, c.time, item, ignoreId);
          const on = time === c.time;
          return (
            <button
              key={c.label}
              type="button"
              aria-pressed={on}
              onClick={() => onTime(c.time)}
              className={cn(
                "flex min-h-16 flex-col items-start justify-center rounded-[6px] border-2 px-4 py-2 text-left leading-tight transition-colors",
                on ? "border-mist-ink bg-mist-ink text-paper" : "border-paper-line bg-paper-raised hover:border-mist-ink",
              )}
            >
              <span className="text-[17px] font-medium">{c.label}</span>
              <span className={cn("mt-1 text-[16px]", on ? "text-paper/80" : "text-mist-muted")}>
                <Tabular>{c.time}</Tabular> · {ok ? "fits" : "busy"}
              </span>
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex flex-wrap items-center gap-3 text-[17px]">
        Or a time of your choice
        <input
          type="time"
          name="time"
          form={form}
          step={900}
          required
          value={time}
          onChange={(e) => onTime(e.target.value)}
          className="h-14 rounded-[6px] border-2 border-paper-line bg-paper-raised px-4 text-[18px] focus:border-mist-ink"
        />
      </label>
      {day && /^\d{2}:\d{2}$/.test(time) && <FitLine trip={trip} dayKey={dayKey} time={time} item={item} ignoreId={ignoreId} multiDay={multiDay} />}
    </fieldset>
  );
}

function FitLine({
  trip,
  dayKey,
  time,
  item,
  ignoreId,
  multiDay,
}: {
  trip: BuilderTrip;
  dayKey: string;
  time: string;
  item: { durationMinutes: number };
  ignoreId?: string;
  multiDay: boolean;
}) {
  const day = trip.days.find((d) => d.key === dayKey)!;
  const ok = fits(trip, dayKey, time, item, ignoreId);
  const start = toMin(time);
  const end = start + item.durationMinutes;
  let text: string;
  if (multiDay) {
    const n = Math.ceil(item.durationMinutes / (24 * 60));
    const last = day.dayNumber + n - 1;
    text = ok
      ? `A ${n}-day programme: Days ${day.dayNumber}–${last}.`
      : last > trip.days.length
        ? `This needs ${n} days, and your trip ends on Day ${trip.days.length}. Choose an earlier day.`
        : `This needs Days ${day.dayNumber}–${last} free, from a morning. Choose a morning on an open day.`;
  } else {
    const clash = day.blocks.find(
      (b) => b.id !== ignoreId && b.spanDays === 1 && toMin(b.time) < end && start < toMin(b.time) + b.durationMinutes,
    );
    const next = day.blocks.filter((b) => b.id !== ignoreId && toMin(b.time) >= end).sort((a, z) => toMin(a.time) - toMin(z.time))[0];
    text = clash
      ? `It would run ${time}–${toTime(end % 1440)} and overlap ${clash.title} at ${clash.time}. You can still choose it, or pick another time.`
      : ok
        ? `${time}–${toTime(end % 1440)}${next ? `, before ${next.title} at ${next.time}` : ""}.`
        : `It would run until ${toTime(end % 1440)}, late into the evening.`;
  }
  return (
    <p role="status" className="mt-4 flex items-start gap-2.5 text-[17px] leading-snug">
      {ok ? (
        <Check className="mt-1 h-5 w-5 shrink-0 text-success-600" strokeWidth={2} aria-hidden="true" />
      ) : (
        <TriangleAlert className="mt-1 h-5 w-5 shrink-0 text-gold-700" strokeWidth={1.75} aria-hidden="true" />
      )}
      <span>{text}</span>
    </p>
  );
}
