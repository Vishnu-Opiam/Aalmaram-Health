import "server-only";
import type { AddedBy, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, forbidden, notFound, validation } from "@/lib/errors";
import { blockPrice, placementProblems, toBlockStart } from "@/domain/trips/blocks";
import { assertItineraryEditable, assertTransition } from "@/domain/trips/status";

/**
 * Block mutations shared by the admin builder and the client portal.
 *
 * Callers pass a `scope`: staff may touch any block; a client may only touch
 * blocks on their own trip that they or the AI added — never the team's
 * health core. Every id arrives from the browser, so ownership is re-checked
 * here, in one place.
 */
export type BlockScope = { kind: "staff" } | { kind: "client"; clientId: string };

type Tx = Prisma.TransactionClient;

export async function loadTripForMutation(tripId: string, scope: BlockScope, db: Tx | typeof prisma = prisma) {
  const trip = await db.trip.findFirst({
    where: { id: tripId, ...(scope.kind === "client" ? { clientId: scope.clientId } : {}) },
    select: {
      id: true,
      clientId: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      travellers: true,
      itinerary: { select: { id: true, confirmedAt: true } },
    },
  });
  if (!trip || !trip.itinerary) {
    if (scope.kind === "client") throw forbidden("That trip is not available on your account.");
    throw notFound("That trip");
  }
  return { ...trip, itinerary: trip.itinerary };
}

async function resolveComponentAndBranch(componentId: string, branchId: string | null) {
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    select: {
      id: true,
      name: true,
      status: true,
      price: true,
      currency: true,
      priceUnit: true,
      durationMinutes: true,
      vendorId: true,
      vendor: {
        select: { status: true, branches: { where: { status: "ACTIVE" }, select: { id: true, vendorId: true } } },
      },
    },
  });
  if (!component) throw notFound("That experience");
  if (component.status !== "ACTIVE" || component.vendor.status !== "ACTIVE") {
    throw conflict(`"${component.name}" is not available at the moment.`);
  }

  const branches = component.vendor.branches;
  let branch: { id: string; vendorId: string } | null = null;
  if (branchId) {
    branch = await prisma.branch.findFirst({
      where: { id: branchId, status: "ACTIVE" },
      select: { id: true, vendorId: true },
    });
    if (!branch) throw validation("Please choose a location.", { branchId: ["That location is not available."] });
  } else if (branches.length === 1) {
    branch = branches[0];
  } else if (branches.length > 1) {
    throw validation("Please choose a location.", { branchId: ["Choose the location nearest to where you stay."] });
  }
  return { component, branch };
}

function assertPlacement(
  trip: { startDate: Date; endDate: Date },
  startsAt: Date,
  component: { durationMinutes: number; vendorId: string },
  branch: { vendorId: string } | null,
) {
  const problems = placementProblems({
    startsAt,
    durationMinutes: component.durationMinutes,
    tripStart: trip.startDate,
    tripEnd: trip.endDate,
    componentVendorId: component.vendorId,
    branch,
  });
  if (problems.length > 0) throw validation(problems[0], { day: problems });
}

export async function addBlock(input: {
  tripId: string;
  scope: BlockScope;
  componentId: string;
  branchId: string | null;
  day: string;
  time: string;
  addedBy: AddedBy;
  db?: Tx;
}) {
  const trip = await loadTripForMutation(input.tripId, input.scope, input.db);
  assertItineraryEditable(trip.status, trip.itinerary.confirmedAt);
  const { component, branch } = await resolveComponentAndBranch(input.componentId, input.branchId);
  const startsAt = toBlockStart(input.day, input.time);
  assertPlacement(trip, startsAt, component, branch);

  return (input.db ?? prisma).itineraryItem.create({
    data: {
      itineraryId: trip.itinerary.id,
      componentId: component.id,
      branchId: branch?.id ?? null,
      startsAt,
      addedBy: input.addedBy,
      price: blockPrice(component.price, component.priceUnit, trip.travellers),
      currency: component.currency,
    },
    select: { id: true, itineraryId: true },
  });
}

async function loadBlockForMutation(blockId: string, scope: BlockScope) {
  const block = await prisma.itineraryItem.findUnique({
    where: { id: blockId },
    select: { id: true, addedBy: true, componentId: true, branchId: true, itinerary: { select: { tripId: true } } },
  });
  if (!block) throw notFound("That activity");
  const trip = await loadTripForMutation(block.itinerary.tripId, scope);
  assertItineraryEditable(trip.status, trip.itinerary.confirmedAt);
  if (scope.kind === "client" && block.addedBy === "TEAM") {
    throw forbidden("Your health appointments are arranged by your relationship manager. Please ask them to change these.");
  }
  return { block, trip };
}

export async function moveBlock(input: {
  blockId: string;
  scope: BlockScope;
  day: string;
  time: string;
  branchId: string | null;
}) {
  const { block, trip } = await loadBlockForMutation(input.blockId, input.scope);
  const { component, branch } = await resolveComponentAndBranch(
    block.componentId,
    input.branchId ?? block.branchId,
  );
  const startsAt = toBlockStart(input.day, input.time);
  assertPlacement(trip, startsAt, component, branch);
  await prisma.itineraryItem.update({
    where: { id: block.id },
    data: { startsAt, branchId: branch?.id ?? null },
  });
  return { tripId: trip.id, itineraryId: trip.itinerary.id };
}

export async function removeBlock(input: { blockId: string; scope: BlockScope }) {
  const { block, trip } = await loadBlockForMutation(input.blockId, input.scope);
  await prisma.itineraryItem.delete({ where: { id: block.id } });
  return { tripId: trip.id, itineraryId: trip.itinerary.id };
}

/**
 * Confirm → lock. Prices are recomputed one last time and frozen, the
 * itinerary is locked and the trip waits for payment. Nothing is booked yet.
 */
export async function confirmItinerary(tripId: string, scope: BlockScope) {
  const trip = await loadTripForMutation(tripId, scope);
  assertItineraryEditable(trip.status, trip.itinerary.confirmedAt);
  assertTransition(trip.status, "AWAITING_PAYMENT");
  const blocks = await prisma.itineraryItem.count({ where: { itineraryId: trip.itinerary.id } });
  if (blocks === 0) throw conflict("Add at least one activity before confirming.");

  const confirmedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await repriceItinerary(trip.id, tx);
    await tx.itinerary.update({ where: { id: trip.itinerary.id }, data: { confirmedAt } });
    await tx.trip.update({ where: { id: trip.id }, data: { status: "AWAITING_PAYMENT" } });
  });
  return { trip, blocks, confirmedAt };
}

/** Recomputes every block price from current component prices and the trip's travellers. */
export async function repriceItinerary(tripId: string, db: Tx) {
  const trip = await db.trip.findUniqueOrThrow({
    where: { id: tripId },
    select: {
      travellers: true,
      itinerary: {
        select: {
          items: { select: { id: true, component: { select: { price: true, priceUnit: true, currency: true } } } },
        },
      },
    },
  });
  for (const item of trip.itinerary?.items ?? []) {
    await db.itineraryItem.update({
      where: { id: item.id },
      data: {
        price: blockPrice(item.component.price, item.component.priceUnit, trip.travellers),
        currency: item.component.currency,
      },
    });
  }
}
