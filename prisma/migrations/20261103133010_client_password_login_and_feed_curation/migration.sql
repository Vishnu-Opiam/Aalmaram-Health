/*
  Warnings:

  - You are about to drop the column `accessTokenExpiresAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `accessTokenHash` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `accessTokenIssuedAt` on the `Client` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "AiTask" ADD VALUE 'FEED_CURATION';

-- DropIndex
DROP INDEX "Client_accessTokenHash_key";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "accessTokenExpiresAt",
DROP COLUMN "accessTokenHash",
DROP COLUMN "accessTokenIssuedAt",
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordSetAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FeedPost" ADD COLUMN     "aiReason" TEXT;
