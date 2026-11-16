"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { BuilderTrip, Library, LibraryComponent } from "@/domain/trips/builder-view";
import { useUrlPanel } from "../sheet";
import { AddSheet } from "./add-sheet";
import { ALL, DateStrip } from "./date-strip";
import { DayChapter } from "./day-chapter";
import { ItemSheet } from "./item-sheet";
import { dayState, firstFreeSlot } from "./plan";
import type { DaysActions, DaysCtx } from "./types";
import { WholeTrip } from "./whole-trip";

const TIME = /^\d{2}:\d{2}$/;

/**
 * Day by day: the date strip, then one day in focus (or the whole trip), and
 * the item and add panels. The chosen day lives in the URL (`?day=`, or
 * `?view=all`): the strip's links work without JavaScript, and with it a day
 * switches in place, Back stepping through the days chosen.
 */
export function DayBook({
  trip,
  library,
  actions,
  contact,
  initialDay,
  todayKey,
  highlight,
  focusDay,
  aside,
}: {
  trip: BuilderTrip;
  library: Library;
  actions: DaysActions;
  contact: string;
  /** The server's choice when the URL names no day (today, the linked item's day, or the first planned day). */
  initialDay: string;
  todayKey: string | null;
  highlight: { id: string; label: string } | null;
  /** After a removal: put focus on the day's heading (the activity itself is gone). */
  focusDay?: boolean;
  /** The total and "Review and confirm" (server-rendered): a side card on wide screens, a bar on phones. */
  aside: React.ReactNode;
}) {
  const search = useSearchParams();
  const keys = useMemo(() => new Set(trip.days.map((d) => d.key)), [trip]);
  const dayParam = search.get("day");
  const selected = search.get("view") === ALL ? ALL : dayParam && keys.has(dayParam) ? dayParam : initialDay;
  const day = trip.days.find((d) => d.key === selected);

  const [itemId, openItemPanel, closeItem] = useUrlPanel("item");
  const [addKey, , closeAddPanel] = useUrlPanel("add");
  const moveFirst = useRef(false);

  const byId = useMemo(() => {
    const map = new Map<string, LibraryComponent>();
    for (const m of library.modules) for (const c of m.catalogues) for (const comp of c.components) map.set(comp.id, comp);
    return map;
  }, [library]);
  const blocks = useMemo(() => new Map(trip.days.flatMap((d) => d.blocks.map((b) => [b.id, b] as const))), [trip]);

  const select = useCallback((key: string, replace = false) => {
    const url = new URL(window.location.href);
    if (key === ALL) {
      url.searchParams.delete("day");
      url.searchParams.set("view", ALL);
    } else {
      url.searchParams.delete("view");
      url.searchParams.set("day", key);
    }
    url.hash = "";
    window.history[replace ? "replaceState" : "pushState"]({ day: key }, "", url);
  }, []);

  const ctx: DaysCtx = useMemo(() => {
    const base = `/trip/itinerary?trip=${encodeURIComponent(trip.id)}`;
    return {
      trip,
      contact,
      actions,
      byId,
      highlight,
      back: (key) => `${base}&day=${key}`,
      explore: (key, at) => `/trip/explore?trip=${encodeURIComponent(trip.id)}&for=${key}${at ? `&slot=${at}` : ""}`,
      openItem: (id, move = false) => {
        moveFirst.current = move;
        openItemPanel(id);
      },
      openAdd: (key, at, componentId) => {
        const url = new URL(window.location.href);
        url.searchParams.set("add", key);
        if (at) url.searchParams.set("slot", at);
        else url.searchParams.delete("slot");
        if (componentId) url.searchParams.set("pick", componentId);
        else url.searchParams.delete("pick");
        window.history[window.history.state?.panel === "add" ? "replaceState" : "pushState"]({ panel: "add" }, "", url);
      },
    };
  }, [trip, contact, actions, byId, highlight, openItemPanel]);

  const closeAdd = useCallback(() => {
    if (window.history.state?.panel === "add") return closeAddPanel();
    const url = new URL(window.location.href);
    for (const k of ["add", "slot", "pick"]) url.searchParams.delete(k);
    window.history.replaceState(null, "", url);
  }, [closeAddPanel]);

  // Old links (`#day-2026-12-21`, from before days had their own URL) open that day.
  useEffect(() => {
    const m = /^#day-(\d{4}-\d{2}-\d{2})$/.exec(window.location.hash);
    if (m && !search.get("day") && keys.has(m[1]) && m[1] !== selected) select(m[1], true);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a change, focus the changed activity (its card) and bring it into view.
  useEffect(() => {
    if (focusDay) document.getElementById(`day-${selected}-title`)?.focus({ preventScroll: true });
    if (!highlight) return;
    const card = document.querySelector<HTMLElement>(`#block-${CSS.escape(highlight.id)} button`);
    if (!card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [highlight]);

  // Switching days from far down the page: bring the new chapter's top under the strip.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = document.getElementById(selected === ALL ? "whole-trip-title" : `day-${selected}`);
    const strip = document.querySelector<HTMLElement>("nav[aria-label='Your days']");
    if (!target || !strip) return;
    const offset = strip.getBoundingClientRect().bottom + 8;
    const top = target.getBoundingClientRect().top;
    if (top < offset) window.scrollTo({ top: window.scrollY + top - offset });
  }, [selected]);

  const openBlock = itemId ? blocks.get(itemId) : undefined;
  const addDay = addKey && trip.editable ? trip.days.find((d) => d.key === addKey) : undefined;
  const slot = search.get("slot");
  const pick = search.get("pick");

  return (
    <>
      <DateStrip
        days={trip.days.map((d) => ({ key: d.key, dayNumber: d.dayNumber, state: dayState(trip, d) }))}
        selected={selected}
        todayKey={todayKey}
        href={(key) => `?trip=${encodeURIComponent(trip.id)}&${key === ALL ? "view=all" : `day=${key}`}`}
        onSelect={select}
      />
      <div className="pk-frame grid gap-x-12 pt-6 md:grid-cols-[minmax(0,1fr)_17rem] md:pt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-20">
        <div className="min-w-0">{day ? <DayChapter key={day.key} ctx={ctx} day={day} /> : <WholeTrip ctx={ctx} onDay={select} />}</div>
        <aside aria-label="Your trip so far" className="md:pt-0">
          {aside}
        </aside>
      </div>

      {openBlock && <ItemSheet key={openBlock.id} ctx={ctx} block={openBlock} startMoving={moveFirst.current} onClose={closeItem} />}
      {addDay && (
        <AddSheet
          key={`${addDay.key}-${pick}`}
          ctx={ctx}
          day={addDay}
          at={slot && TIME.test(slot) ? slot : (firstFreeSlot(addDay.blocks)?.at ?? "10:00")}
          preselect={pick && byId.has(pick) ? pick : null}
          onClose={closeAdd}
        />
      )}
    </>
  );
}
