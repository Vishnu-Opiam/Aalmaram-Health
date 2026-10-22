import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { loadBuilderTrip } from "@/domain/trips/queries";
import { formatDateRange, formatLongDate, parseDateInput } from "@/domain/shared/dates";
import { signOutClientAction } from "./actions";

export const metadata: Metadata = { title: "Your trip" };

/**
 * Read-only view of the client's trips while the portal builder is built
 * (Phase 3 replaces this page).
 */
export default async function TripPage() {
  const client = await requireClientPage();
  const trips = await prisma.trip.findMany({
    where: { clientId: client.id, status: { not: "CANCELLED" } },
    orderBy: { startDate: "asc" },
    select: { id: true },
  });
  const views = (
    await Promise.all(trips.map((t) => loadBuilderTrip(t.id, { kind: "client", clientId: client.id })))
  ).filter((v) => v !== null);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-serif text-4xl tracking-tight text-ink-900">Welcome, {client.name.split(" ")[0]}</h1>
      {views.length === 0 && (
        <p className="mt-5 text-[17px] text-ink-600">Your Aalmaram team is preparing your trip.</p>
      )}
      {views.map((trip) => (
        <section key={trip.id} className="mt-10">
          <h2 className="font-serif text-2xl text-ink-900">{trip.name}</h2>
          <p className="text-ink-500">{formatDateRange(parseDateInput(trip.startDate), parseDateInput(trip.endDate))}</p>
          <ol className="mt-6 space-y-6">
            {trip.days.map((day) => (
              <li key={day.key}>
                <h3 className="text-[15px] font-medium text-ink-900">
                  Day {day.dayNumber} · {formatLongDate(parseDateInput(day.key))}
                </h3>
                <ul className="mt-2 space-y-1 text-[15px] text-ink-700">
                  {day.blocks.map((block) => (
                    <li key={block.id}>
                      {block.time} – {block.title}
                    </li>
                  ))}
                  {day.blocks.length === 0 && <li className="text-ink-400">Free day</li>}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <form action={signOutClientAction} className="mt-12">
        <button type="submit" className="text-[13px] text-ink-400 underline underline-offset-4 hover:text-ink-600">
          Sign out of this device
        </button>
      </form>
    </div>
  );
}
