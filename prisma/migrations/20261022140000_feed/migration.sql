-- CreateEnum
CREATE TYPE "FeedSource" AS ENUM ('VENDOR_INSTAGRAM', 'KERALA_TOURISM', 'NEWS');

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "source" "FeedSource" NOT NULL,
    "vendorId" TEXT,
    "caption" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "link" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedPost_externalId_key" ON "FeedPost"("externalId");

-- CreateIndex
CREATE INDEX "FeedPost_hiddenAt_publishedAt_idx" ON "FeedPost"("hiddenAt", "publishedAt");

-- CreateIndex
CREATE INDEX "FeedPost_vendorId_idx" ON "FeedPost"("vendorId");

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

