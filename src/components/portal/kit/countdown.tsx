"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { countdownParts, type CountdownParts } from "./countdown-parts";
import { Tabular } from "./tabular";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "and 14 h 05 min": the hours and minutes left after the whole days, ticking
 * once a minute on the minute (no seconds). The server renders `initial`
 * (from countdownParts) so hydration matches; only the part that changed
 * rises in. Minutes sit in fixed digit cells so the line never shifts as
 * they tick (General Sans has no tabular figures). Hidden from screen readers, which get one static sentence
 * instead (`srText`), so nothing is announced every minute.
 */
export function Countdown({
  target,
  initial,
  prefix = "and",
  srText,
  className,
}: {
  /** ISO instant, e.g. keralaMidnight(trip.startDate). */
  target: string;
  initial: CountdownParts;
  prefix?: string;
  srText?: string;
  className?: string;
}) {
  const [state, setState] = useState({ parts: initial, animate: { h: false, m: false } });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = (live: boolean) => {
      const now = Date.now();
      const next = countdownParts(target, now);
      setState((s) => ({
        parts: next,
        animate: { h: s.animate.h || (live && next.hours !== s.parts.hours), m: s.animate.m || (live && next.minutes !== s.parts.minutes) },
      }));
      if (!next.past) timer = setTimeout(() => tick(true), 60_000 - (now % 60_000) + 50);
    };
    tick(false);
    return () => clearTimeout(timer);
  }, [target]);

  const { parts, animate } = state;
  if (parts.past) return null;
  return (
    <span className={cn("pk-time", className)}>
      <span aria-hidden="true">
        {prefix && `${prefix} `}
        <span key={`h${parts.hours}`} className={cn(animate.h && "pk-tick")}>{parts.hours}</span> h{" "}
        <span key={`m${parts.minutes}`} className={cn(animate.m && "pk-tick")}><Tabular>{pad(parts.minutes)}</Tabular></span> min
      </span>
      <span className="sr-only">
        {srText ?? `${initial.days} days, ${initial.hours} hours and ${initial.minutes} minutes to go.`}
      </span>
    </span>
  );
}
