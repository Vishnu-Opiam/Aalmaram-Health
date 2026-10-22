-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('PER_PERSON', 'FOR_TWO', 'PER_GROUP');

-- AlterTable: Component. Data-migrates the free-text `unit` before dropping it;
-- anything unrecognised becomes PER_PERSON (the old default) for a human to check.
-- Existing rows get a 60-minute duration, flagged the same way.
ALTER TABLE "Component"
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "priceUnit" "PriceUnit" NOT NULL DEFAULT 'PER_PERSON',
ADD COLUMN     "recoveryTimeMinutes" INTEGER;

UPDATE "Component" SET "priceUnit" = CASE
    WHEN lower("unit") LIKE '%two%' OR lower("unit") LIKE '%couple%' THEN 'FOR_TWO'::"PriceUnit"
    WHEN lower("unit") LIKE '%group%' THEN 'PER_GROUP'::"PriceUnit"
    ELSE 'PER_PERSON'::"PriceUnit"
  END;
UPDATE "Component" SET "durationMinutes" = 60 WHERE "durationMinutes" IS NULL;

ALTER TABLE "Component" ALTER COLUMN "durationMinutes" SET NOT NULL,
DROP COLUMN "unit";

-- AlterTable: Vendor. `accreditation` text folds into `accreditations[]` (VendorCredential
-- folded into Vendor, 15 Oct) and `location` becomes the HQ city.
ALTER TABLE "Vendor"
ADD COLUMN     "accreditations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "description" TEXT,
ADD COLUMN     "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hqCity" TEXT,
ADD COLUMN     "hqCountry" TEXT,
ADD COLUMN     "hqLine" TEXT,
ADD COLUMN     "hqPostcode" TEXT,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "owners" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "socialLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "staffCount" INTEGER,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "yearEstablished" INTEGER;

UPDATE "Vendor" SET "accreditations" = ARRAY["accreditation"]
  WHERE "accreditation" IS NOT NULL AND btrim("accreditation") <> '';
UPDATE "Vendor" SET "hqCity" = "location", "hqCountry" = 'India'
  WHERE "location" IS NOT NULL AND btrim("location") <> '';

ALTER TABLE "Vendor" DROP COLUMN "accreditation",
DROP COLUMN "location";

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT NOT NULL,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practitioner" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsOfExperience" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practitioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentPractitioner" (
    "componentId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,

    CONSTRAINT "ComponentPractitioner_pkey" PRIMARY KEY ("componentId","practitionerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_vendorId_name_key" ON "Branch"("vendorId", "name");

-- CreateIndex
CREATE INDEX "Practitioner_vendorId_idx" ON "Practitioner"("vendorId");

-- CreateIndex
CREATE INDEX "ComponentPractitioner_practitionerId_idx" ON "ComponentPractitioner"("practitionerId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practitioner" ADD CONSTRAINT "Practitioner_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentPractitioner" ADD CONSTRAINT "ComponentPractitioner_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentPractitioner" ADD CONSTRAINT "ComponentPractitioner_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
