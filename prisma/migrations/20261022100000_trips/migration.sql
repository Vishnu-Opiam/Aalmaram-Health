-- Phase 2: Client 1->* Trip, Trip 1->1 Itinerary (class diagram v1).
--
-- Backfill, in order:
--   * every User gets roles [ADMIN];
--   * every Itinerary becomes a Trip for its client (name = title; dates from the
--     itinerary, else the client's trip dates; APPROVED -> AWAITING_PAYMENT with
--     confirmedAt = approvedAt, ARCHIVED -> CANCELLED, anything else -> PLANNING);
--   * items become blocks: startsAt = scheduled day (or trip start + dayNumber) at
--     09:00 plus two hours per sequence step, addedBy TEAM, price = override or
--     component price; REMOVED items are deleted;
--   * a client's intake text becomes the requirements summary of their latest
--     trip; a client with intake text or trip dates but no itinerary gets a
--     placeholder trip so nothing is lost.
-- Ids of backfilled rows are derived ('trip_' || itinerary id) so re-reading the
-- data is deterministic.

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'RELATIONSHIP_MANAGER');
CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'AWAITING_PAYMENT', 'BOOKING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "Pace" AS ENUM ('RELAXED', 'BALANCED', 'PACKED');
CREATE TYPE "Channel" AS ENUM ('AI_CHAT', 'STAFF_CHAT', 'CALL', 'EMAIL', 'WHATSAPP', 'IN_PERSON');
CREATE TYPE "AddedBy" AS ENUM ('TEAM', 'CLIENT', 'AI');

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "travellers" INTEGER NOT NULL DEFAULT 1,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripRequirements" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "budgetAmount" DECIMAL(10,2),
    "budgetCurrency" TEXT,
    "pace" "Pace",
    "mustHaves" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripRequirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripModuleShare" (
    "requirementsId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,

    CONSTRAINT "TripModuleShare_pkey" PRIMARY KEY ("requirementsId","moduleId")
);

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tripId" TEXT,
    "channel" "Channel" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "transcript" TEXT NOT NULL,
    "summary" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- Users -> staff roles
ALTER TABLE "User" ADD COLUMN "roles" "StaffRole"[] DEFAULT ARRAY['ADMIN']::"StaffRole"[];
UPDATE "User" SET "roles" = ARRAY['ADMIN']::"StaffRole"[];
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "UserRole";

-- Client profile fields
ALTER TABLE "Client"
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "relationshipManagerId" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- Itineraries -> trips
ALTER TABLE "Itinerary" ADD COLUMN "confirmedAt" TIMESTAMP(3), ADD COLUMN "tripId" TEXT;

INSERT INTO "Trip" ("id", "clientId", "name", "startDate", "endDate", "travellers", "status", "createdAt", "updatedAt")
SELECT
  'trip_' || i."id",
  i."clientId",
  i."title",
  COALESCE(i."startDate", c."tripStartDate", i."createdAt")::date,
  GREATEST(
    COALESCE(i."endDate", c."tripEndDate", i."startDate", c."tripStartDate", i."createdAt")::date,
    COALESCE(i."startDate", c."tripStartDate", i."createdAt")::date
  ),
  1,
  (CASE i."status"
     WHEN 'APPROVED' THEN 'AWAITING_PAYMENT'
     WHEN 'ARCHIVED' THEN 'CANCELLED'
     ELSE 'PLANNING'
   END)::"TripStatus",
  i."createdAt",
  CURRENT_TIMESTAMP
FROM "Itinerary" i
JOIN "Client" c ON c."id" = i."clientId";

UPDATE "Itinerary"
SET "tripId" = 'trip_' || "id",
    "confirmedAt" = CASE WHEN "status" = 'APPROVED' THEN "approvedAt" END;

-- Items -> blocks
ALTER TABLE "ItineraryItem"
ADD COLUMN     "addedBy" "AddedBy",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "startsAt" TIMESTAMP(3);

DELETE FROM "ItineraryItem" WHERE "status" = 'REMOVED';

UPDATE "ItineraryItem" ii
SET "startsAt" = (
      COALESCE(ii."scheduledDate"::date, t."startDate" + (GREATEST(COALESCE(ii."dayNumber", 1), 1) - 1))
    )::timestamp + INTERVAL '9 hours' + LEAST(ii."sequence", 5) * INTERVAL '2 hours',
    "addedBy" = 'TEAM',
    "price" = COALESCE(ii."priceOverride", comp."price"),
    "currency" = comp."currency"
FROM "Itinerary" i, "Trip" t, "Component" comp
WHERE i."id" = ii."itineraryId" AND t."id" = i."tripId" AND comp."id" = ii."componentId";

ALTER TABLE "ItineraryItem"
ALTER COLUMN "addedBy" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "price" SET NOT NULL,
ALTER COLUMN "startsAt" SET NOT NULL;

DROP INDEX "ItineraryItem_itineraryId_dayNumber_sequence_idx";
DROP INDEX "ItineraryItem_itineraryId_idx";
ALTER TABLE "ItineraryItem" DROP COLUMN "dayNumber",
DROP COLUMN "priceOverride",
DROP COLUMN "scheduledDate",
DROP COLUMN "sequence",
DROP COLUMN "status";
DROP TYPE "ItineraryItemStatus";

ALTER TABLE "Itinerary" DROP CONSTRAINT "Itinerary_clientId_fkey";
DROP INDEX "Itinerary_clientId_idx";
DROP INDEX "Itinerary_status_idx";
ALTER TABLE "Itinerary" DROP COLUMN "approvedAt",
DROP COLUMN "clientId",
DROP COLUMN "endDate",
DROP COLUMN "publishedAt",
DROP COLUMN "startDate",
DROP COLUMN "status",
DROP COLUMN "title";
ALTER TABLE "Itinerary" ALTER COLUMN "tripId" SET NOT NULL;
DROP TYPE "ItineraryStatus";

-- Clients with intake but no itinerary keep their data on a placeholder trip.
INSERT INTO "Trip" ("id", "clientId", "name", "startDate", "endDate", "status", "createdAt", "updatedAt")
SELECT
  'trip_' || c."id",
  c."id",
  'First trip (dates to confirm)',
  COALESCE(c."tripStartDate", c."createdAt")::date,
  GREATEST(COALESCE(c."tripEndDate", c."tripStartDate", c."createdAt")::date, COALESCE(c."tripStartDate", c."createdAt")::date),
  'PLANNING',
  c."createdAt",
  CURRENT_TIMESTAMP
FROM "Client" c
WHERE NOT EXISTS (SELECT 1 FROM "Trip" t WHERE t."clientId" = c."id")
  AND (c."tripStartDate" IS NOT NULL OR c."healthInterests" IS NOT NULL OR c."wellnessInterests" IS NOT NULL
       OR c."culturalInterests" IS NOT NULL OR c."intakeNotes" IS NOT NULL);

INSERT INTO "Itinerary" ("id", "tripId", "createdAt", "updatedAt")
SELECT 'itin_' || t."id", t."id", t."createdAt", CURRENT_TIMESTAMP
FROM "Trip" t
WHERE NOT EXISTS (SELECT 1 FROM "Itinerary" i WHERE i."tripId" = t."id");

-- Intake text -> requirements summary of the client's latest trip
INSERT INTO "TripRequirements" ("id", "tripId", "summary", "updatedAt")
SELECT DISTINCT ON (t."clientId")
  'req_' || t."id",
  t."id",
  concat_ws(E'\n\n',
    'Health: ' || c."healthInterests",
    'Wellness: ' || c."wellnessInterests",
    'Culture: ' || c."culturalInterests",
    'Notes: ' || c."intakeNotes"),
  CURRENT_TIMESTAMP
FROM "Trip" t
JOIN "Client" c ON c."id" = t."clientId"
WHERE c."healthInterests" IS NOT NULL OR c."wellnessInterests" IS NOT NULL
   OR c."culturalInterests" IS NOT NULL OR c."intakeNotes" IS NOT NULL
ORDER BY t."clientId", t."createdAt" DESC;

ALTER TABLE "Client" DROP COLUMN "culturalInterests",
DROP COLUMN "healthInterests",
DROP COLUMN "intakeNotes",
DROP COLUMN "tripDuration",
DROP COLUMN "tripEndDate",
DROP COLUMN "tripStartDate",
DROP COLUMN "wellnessInterests";

-- CreateIndex
CREATE INDEX "Trip_clientId_idx" ON "Trip"("clientId");
CREATE INDEX "Trip_status_idx" ON "Trip"("status");
CREATE UNIQUE INDEX "TripRequirements_tripId_key" ON "TripRequirements"("tripId");
CREATE INDEX "TripModuleShare_moduleId_idx" ON "TripModuleShare"("moduleId");
CREATE INDEX "Conversation_clientId_idx" ON "Conversation"("clientId");
CREATE INDEX "Conversation_tripId_idx" ON "Conversation"("tripId");
CREATE INDEX "Client_relationshipManagerId_idx" ON "Client"("relationshipManagerId");
CREATE UNIQUE INDEX "Itinerary_tripId_key" ON "Itinerary"("tripId");
CREATE INDEX "ItineraryItem_itineraryId_startsAt_idx" ON "ItineraryItem"("itineraryId", "startsAt");
CREATE INDEX "ItineraryItem_branchId_idx" ON "ItineraryItem"("branchId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_relationshipManagerId_fkey" FOREIGN KEY ("relationshipManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripRequirements" ADD CONSTRAINT "TripRequirements_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripModuleShare" ADD CONSTRAINT "TripModuleShare_requirementsId_fkey" FOREIGN KEY ("requirementsId") REFERENCES "TripRequirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripModuleShare" ADD CONSTRAINT "TripModuleShare_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
