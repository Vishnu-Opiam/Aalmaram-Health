import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";
import { ButtonLink, buttonClass } from "@/components/portal/kit/button";
import { StickyBar } from "@/components/portal/kit/controls";
import { Toast } from "@/components/portal/kit/toast";
import { ActionButton, undoClass } from "@/components/portal/days/action-button";
import { DayBook } from "@/components/portal/days/day-book";
import styles from "@/components/portal/days/days.module.css";
import { dayState, euros, weekday } from "@/components/portal/days/plan";
import { firstName } from "@/components/portal/ui";
import { AppLink } from "@/components/ui/primitives";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { dateRange } from "@/components/portal/my-trip/moment";
import { keralaDay, toDateInputValue } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { cn, param, pluralise } from "@/lib/utils";
import {
  addClientBlockAction,
  buildMyItineraryAction,
  moveClientBlockAction,
  removeClientBlockAction,
  suggestForClientSlot,
  talkToPersonAction,
} from "../../actions";

export const metadata: Metadata = { title: "Day by day" };

// `<componentId>.<day>.<HH:MM>.<branchId|->`: where an activity was, for Undo (see the move/remove actions).
const WHEREABOUTS = /^([\w-]{1,60})\.(\d{4}-\d{2}-\d{2})\.(\d{2}:\d{2})\.([\w-]{1,60})$/;

export default async function ItineraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const params = await searchParams;
  const trips = await loadPortalTrips(client.id);
  const current = pickTrip(trips, param(params, "trip") || undefined);

  if (!current) {
    return (
      <>
        <section className="pk-night">
          <div className="pk-frame py-10 md:py-16">
            <p className="pk-label">Day by day</p>
            <h1 className="pk-h2 mt-2">Your days will appear here</h1>
          </div>
        </section>
        <div className="pk-frame pk-read mt-10">
          <p className="pk-body">Your coordinator is putting your trip together. Your days appear here once your dates are agreed.</p>
          <ButtonLink href="/trip/explore" variant="secondary" className="mt-8">
            Meanwhile, browse places
          </ButtonLink>
        </div>
      </>
    );
  }

  const [trip, library, manager] = await Promise.all([
    loadBuilderTrip(current.id, { kind: "client", clientId: client.id }),
    loadLibrary(),
    prisma.client.findUnique({ where: { id: client.id }, select: { relationshipManager: { select: { name: true } } } }),
  ]);
  if (!trip) return null;

  const contact = manager?.relationshipManager ? firstName(manager.relationshipManager.name) : "us";
  const blocks = new Map(trip.days.flatMap((d) => d.blocks.map((b) => [b.id, b] as const)));
  const all = [...blocks.values()];
  const booked = all.filter((b) => b.progress === "booked").length;
  const keys = new Set(trip.days.map((d) => d.key));
  const back = (key: string) => `/trip/itinerary?trip=${encodeURIComponent(trip.id)}&day=${key}`;

  // Which day opens: the one named, the linked or just-changed activity's, today, the first planned day, Day 1.
  const today = toDateInputValue(keralaDay(new Date()));
  const todayKey = keys.has(today) ? today : null;
  const changedId = param(params, "added") || param(params, "just");
  const named = [param(params, "day"), blocks.get(param(params, "item"))?.day, blocks.get(changedId)?.day].find((k) => k && keys.has(k));
  const initialDay =
    named ?? todayKey ?? trip.days.find((d) => dayState(trip, d) !== "free")?.key ?? trip.days[0].key;

  const moved = param(params, "moved") === "1";
  const changed = blocks.get(changedId);
  const highlight = changed ? { id: changed.id, label: moved ? "Moved here" : "Just added" } : null;

  const toast = toastFor();
  function toastFor(): { param: string; value: string; text: string; undo?: React.ReactNode } | null {
    if (param(params, "asked") === "1")
      return { param: "asked", value: "1", text: contact === "us" ? "Thank you. We'll be in touch soon." : `We've let ${contact} know. ${contact} will be in touch soon.` };
    const removed = WHEREABOUTS.exec(param(params, "removed"));
    if (removed) {
      const [value, componentId, day, time, branchId] = removed;
      const name = library.modules.flatMap((m) => m.catalogues.flatMap((c) => c.components)).find((c) => c.id === componentId)?.name ?? "That activity";
      return {
        param: "removed",
        value,
        text: `Removed ${name} from ${keys.has(day) ? weekday(day) : "your trip"}.`,
        undo: trip!.editable ? (
          <ActionButton
            action={addClientBlockAction}
            fields={{ tripId: trip!.id, componentId, day, time, branchId: branchId === "-" ? null : branchId, returnTo: back(day) }}
            className={undoClass}
            errorClassName="text-night-ink"
            pendingLabel="Adding back…"
            label={`Undo: add ${name} back`}
          >
            Undo
          </ActionButton>
        ) : undefined,
      };
    }
    if (!changed) return null;
    if (moved) {
      const from = WHEREABOUTS.exec(param(params, "from"));
      return {
        param: "just",
        value: changed.id,
        // Same day and time, another branch: that was "Change location".
        text:
          from && from[2] === changed.day && from[3] === changed.time
            ? `${changed.title} is now at ${changed.branchLabel ?? changed.place.name}.`
            : `Moved ${changed.title} to ${weekday(changed.day)}, ${changed.time}.`,
        undo:
          from && changed.canEdit ? (
            <ActionButton
              action={moveClientBlockAction}
              fields={{ blockId: changed.id, day: from[2], time: from[3], branchId: from[4] === "-" ? null : from[4] }}
              className={undoClass}
              errorClassName="text-night-ink"
              pendingLabel="Moving back…"
              label={`Undo: move ${changed.title} back`}
            >
              Undo
            </ActionButton>
          ) : undefined,
      };
    }
    return {
      param: param(params, "added") ? "added" : "just",
      value: changed.id,
      text: `Added ${changed.title} to ${weekday(changed.day)}, ${changed.time}.`,
      undo: changed.canEdit ? (
        <ActionButton
          action={removeClientBlockAction}
          fields={{ blockId: changed.id, day: changed.day }}
          className={undoClass}
          errorClassName="text-night-ink"
          pendingLabel="Removing…"
          label={`Undo: remove ${changed.title}`}
        >
          Undo
        </ActionButton>
      ) : undefined,
    };
  }

  const status =
    booked === all.length && all.length > 0
      ? "Everything is booked"
      : trip.status === "AWAITING_PAYMENT" && booked === 0
        ? "Confirmed · payment next"
        : `${booked} of ${all.length} booked`;

  const aside = (
    <StickyBar variant="side" className="md:top-[12.75rem]">
      <section aria-label="Trip total" className="flex w-full items-center justify-between gap-4 md:flex-col md:items-stretch md:gap-5">
        <div className="min-w-0">
          <p className="pk-label hidden md:block">{trip.editable ? "Your trip so far" : "Your trip"}</p>
          <p className="pk-numeral text-[36px] md:mt-3 md:text-[56px]">{euros(trip.total, trip.currency)}</p>
          <p className="mt-1.5 text-[15px] leading-snug text-mist-muted md:mt-2 md:text-[16px]">
            {trip.editable ? (
              <>
                {pluralise(trip.blockCount, "activity", "activities")}
                {trip.travellers > 1 && <span className="block md:inline"> · for {trip.travellers} travellers</span>}
              </>
            ) : (
              <span className="font-medium text-mist-ink">{status}</span>
            )}
          </p>
        </div>
        {trip.editable ? (
          trip.blockCount > 0 && (
            <ButtonLink href={`/trip/itinerary/confirm?trip=${trip.id}`} className="shrink-0 px-5 md:px-7">
              Review and confirm
            </ButtonLink>
          )
        ) : (
          <ActionButton
            action={talkToPersonAction}
            fields={{ tripId: trip.id, returnTo: back(initialDay) }}
            className={buttonClass("secondary", "shrink-0 px-5 md:w-full")}
            pendingLabel="Sending…"
          >
            Ask {contact === "us" ? "us" : contact}
          </ActionButton>
        )}
        <p className="hidden text-[16px] leading-relaxed text-mist-muted md:block">
          {trip.editable
            ? "Nothing is booked until you confirm. Every price is for your whole party."
            : `Your plan is confirmed. To change anything, ${contact === "us" ? "ask us" : `ask ${contact}`}: each activity turns green here once its provider confirms.`}
        </p>
        {trip.editable && (
          <p className="hidden border-t border-paper-line pt-5 text-[16px] text-mist-muted md:block">
            Questions about your days?{" "}
            <AppLink href={`/trip/chat?trip=${trip.id}`} className="font-medium text-mist-ink underline decoration-mist-ink/35 underline-offset-4 hover:decoration-mist-ink">
              Ask {contact}
            </AppLink>
          </p>
        )}
      </section>
    </StickyBar>
  );

  return (
    <div className={styles.page}>
      <section className="pk-night">
        <div className="pk-frame pb-8 pt-8 md:pb-12 md:pt-12">
          {trips.length > 1 && (
            <nav aria-label="Your trips" className="mb-6 flex flex-wrap gap-2">
              {trips.map((t) => (
                <AppLink
                  key={t.id}
                  href={`/trip/itinerary?trip=${t.id}`}
                  aria-current={t.id === trip.id ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center rounded-full border px-5 text-[16px] font-medium",
                    t.id === trip.id ? "border-brass bg-brass text-night" : "border-night-ink/30 text-night-ink hover:border-night-ink",
                  )}
                >
                  {t.name}
                </AppLink>
              ))}
            </nav>
          )}
          <p className="pk-label">Day by day</p>
          <h1 className="pk-h2 mt-2 max-w-[30ch] text-[28px] md:text-[40px]">{trip.name}</h1>
          <p className="mt-3 text-[17px] text-night-muted md:text-[18px]">
            {dateRange(trip.startDate, trip.endDate)} · {pluralise(trip.days.length, "day")} ·{" "}
            {pluralise(trip.travellers, "traveller")}
          </p>
        </div>
      </section>

      <DayBook
        trip={trip}
        library={library}
        contact={contact}
        initialDay={initialDay}
        todayKey={todayKey}
        highlight={highlight}
        focusDay={toast?.param === "removed"}
        aside={aside}
        actions={{
          add: addClientBlockAction,
          move: moveClientBlockAction,
          remove: removeClientBlockAction,
          build: buildMyItineraryAction,
          ask: talkToPersonAction,
          suggest: trip.editable ? suggestForClientSlot : undefined,
        }}
      />

      {toast && <Toast param={toast.param} messages={{ [toast.value]: toast.text }} undo={toast.undo ? { [toast.value]: toast.undo } : undefined} aboveBar />}
    </div>
  );
}
