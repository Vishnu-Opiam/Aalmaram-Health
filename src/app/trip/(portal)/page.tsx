import type { Metadata } from "next";
import { PHOTOS } from "@/app/(site)/content";
import { requireClientPage } from "@/lib/auth/guards";
import { Toast, countdownParts, type PhotoSource } from "@/components/portal/kit";
import { Coordinator } from "@/components/portal/my-trip/coordinator";
import { DayStepper } from "@/components/portal/my-trip/day-stepper";
import {
  dateRange,
  dayIndexOf,
  heroCopy,
  nextStep,
  pickHeroPhoto,
  tripPlaces,
  whereWeAre,
  wholeMoney,
  type HeroItem,
} from "@/components/portal/my-trip/moment";
import { KeralaTeaser, TravelGuide, TripPictures, WhereWeAre } from "@/components/portal/my-trip/sections";
import { TripHero } from "@/components/portal/my-trip/trip-hero";
import { TripSwitcher } from "@/components/portal/trip-switcher";
import { firstName } from "@/components/portal/ui";
import { loadClientFeed } from "@/domain/feed/queries";
import type { BuilderBlock } from "@/domain/trips/builder-view";
import { tripCountdown } from "@/domain/trips/countdown";
import { loadBuilderTrip } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { keralaDay, toDateInputValue } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { param } from "@/lib/utils";
import { talkToPersonAction } from "../actions";

export const metadata: Metadata = { title: "My trip" };

// Kerala moments for the hero, when no place on the trip has a hero photo.
// Brand photos, never presented as a partner's place.
const KERALA: PhotoSource[] = [PHOTOS.lake, PHOTOS.prow, PHOTOS.nets, PHOTOS.palms, PHOTOS.houseboat, PHOTOS.canal, PHOTOS.tea, PHOTOS.kochi];

const heroItem = (b: BuilderBlock): HeroItem => ({ time: b.time, title: b.title, where: b.branchLabel ?? b.place.city });

/**
 * Home: how long until I go, what is my trip, what happens next, what each
 * day holds — then the person looking after it, the places in pictures and a
 * taste of Kerala.
 */
export default async function MyTripPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const query = await searchParams;
  const trips = await loadPortalTrips(client.id);
  const current = pickTrip(trips, param(query, "trip") || undefined);
  const [trip, record, extras, posts] = await Promise.all([
    current ? loadBuilderTrip(current.id, { kind: "client", clientId: client.id }) : null,
    prisma.client.findUnique({
      where: { id: client.id },
      select: { relationshipManager: { select: { name: true, email: true } } },
    }),
    current
      ? prisma.itinerary.findUnique({
          where: { tripId: current.id },
          select: { clientNotes: true, report: { select: { content: true, status: true } } },
        })
      : null,
    loadClientFeed(3),
  ]);

  const now = new Date();
  const todayKey = toDateInputValue(keralaDay(now));
  const manager = record?.relationshipManager ?? null;
  const first = manager ? firstName(manager.name) : null;
  const name = firstName(client.name);
  const report = extras?.report?.status === "PUBLISHED" ? extras.report : null;
  const tripQuery = trip ? `?trip=${encodeURIComponent(trip.id)}` : "";

  const blocks = trip?.days.flatMap((d) => d.blocks) ?? [];
  const booked = blocks.filter((b) => b.progress === "booked").length;
  const countdown = tripCountdown(trip ?? { startDate: null, endDate: null }, now);
  const todayDay = trip?.days.find((d) => d.key === todayKey) ?? null;
  const copy = heroCopy({
    countdown,
    status: trip?.status ?? null,
    name,
    contact: first ?? "your coordinator",
    activities: blocks.length,
    booked,
    firstItem: trip?.days[0]?.blocks[0] ? heroItem(trip.days[0].blocks[0]) : null,
    today: todayDay?.blocks.map(heroItem) ?? [],
  });

  // Today's places lead while in Kerala; otherwise every place on the trip takes its day.
  const ownPhotos = (todayDay?.blocks.length ? todayDay.blocks : blocks).flatMap((b) => b.place.photos.slice(0, 1));
  const heroPhoto = pickHeroPhoto(ownPhotos, KERALA, dayIndexOf(keralaDay(now)));
  const places = trip ? tripPlaces(trip.days) : [];
  const where = trip && countdown.phase !== "during" && countdown.phase !== "lastDay" && countdown.phase !== "after" ? whereWeAre(trip.status, { activities: blocks.length }, first ?? "your coordinator") : null;
  const requestedDay = param(query, "day");
  const focusKey =
    trip?.days.find((d) => d.key === requestedDay)?.key ?? (todayDay && trip ? todayDay.key : trip?.days[0]?.key ?? "");

  const step = trip ? nextStep({ status: trip.status, phase: countdown.phase, blockCount: trip.blockCount, tripId: trip.id, todayKey: todayDay?.key ?? null, contact: first ?? "us" }) : null;

  return (
    <>
      <TripHero
        photo={heroPhoto}
        greeting={copy.big?.includes(name) ? null : `Hello, ${name}`}
        dates={trip ? { long: dateRange(trip.startDate, trip.endDate), short: dateRange(trip.startDate, trip.endDate, true) } : null}
        copy={copy}
        countdown={countdown.targetIso ? { target: countdown.targetIso, parts: countdownParts(countdown.targetIso, now.getTime()) } : null}
        pass={
          trip && step
            ? {
                title: trip.name,
                confirmed: trip.status !== "PLANNING" && trip.status !== "CANCELLED",
                cells: [
                  { value: String(trip.travellers), label: trip.travellers === 1 ? "Traveller" : "Travellers" },
                  { value: String(trip.days.length), label: "Days" },
                  { value: wholeMoney(trip.total, trip.currency), label: trip.editable ? "So far" : "Total" },
                ],
                primary: step.primary,
                secondary: step.secondary,
              }
            : null
        }
      />

      {trip && trips.length > 1 && (
        <div className="pk-frame mt-10">
          <TripSwitcher trips={trips} currentId={trip.id} path="/trip" />
        </div>
      )}

      {where && <WhereWeAre {...where} />}

      {trip && trip.days.length > 0 && (
        <DayStepper trip={trip} focusKey={focusKey} contact={first ?? "us"} />
      )}

      <Coordinator
        tripId={trip?.id ?? null}
        name={manager?.name ?? null}
        first={first ?? "us"}
        email={manager?.email ?? null}
        note={extras?.clientNotes ?? null}
        asked={param(query, "asked") === "1"}
        returnTo={`/trip${tripQuery}`}
        action={talkToPersonAction}
      />

      {report && <TravelGuide content={report.content} />}

      {places.length > 0 && <TripPictures places={places} after={countdown.phase === "after"} />}

      {posts.length > 0 && <KeralaTeaser posts={posts} href={`/trip/kerala${tripQuery}`} />}

      <Toast param="asked" messages={{ "1": `We've let ${first ?? "the team"} know. You'll hear back shortly.` }} />
    </>
  );
}
