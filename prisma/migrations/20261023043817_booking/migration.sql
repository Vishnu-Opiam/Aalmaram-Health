-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "itineraryItemId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedTime" TIMESTAMP(3),
    "vendorReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_itineraryItemId_key" ON "Booking"("itineraryItemId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_itineraryItemId_fkey" FOREIGN KEY ("itineraryItemId") REFERENCES "ItineraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
