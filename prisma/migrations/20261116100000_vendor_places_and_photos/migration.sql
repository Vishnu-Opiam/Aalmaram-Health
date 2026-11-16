-- Vendors become "places" in the portal's Explore: a stable URL slug, a primary
-- module (for partners with no components yet), a type label and highlights.
ALTER TABLE "Vendor" ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "placeType" TEXT,
ADD COLUMN     "slug" TEXT;

-- Backfill slugs from names with the same rule as src/domain/vendors/slug.ts;
-- the (unlikely) second vendor with an identical slug gets an id suffix.
UPDATE "Vendor" SET "slug" = COALESCE(NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''), "id");
UPDATE "Vendor" v SET "slug" = v."slug" || '-' || right(v."id", 6)
WHERE EXISTS (SELECT 1 FROM "Vendor" o WHERE o."slug" = v."slug" AND o."id" < v."id");

ALTER TABLE "Vendor" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "VendorPhoto" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "credit" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorPhoto_vendorId_sortOrder_idx" ON "VendorPhoto"("vendorId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");

-- CreateIndex
CREATE INDEX "Vendor_moduleId_idx" ON "Vendor"("moduleId");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPhoto" ADD CONSTRAINT "VendorPhoto_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
