-- CreateEnum
CREATE TYPE "AiTask" AS ENUM ('TRIP_REQUIREMENTS_EXTRACTION', 'ITINERARY_DRAFT', 'CLIENT_CHAT');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'INVALID_OUTPUT');

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "task" "AiTask" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" "AiRunStatus" NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "entityType" TEXT,
    "entityId" TEXT,
    "actorUserId" TEXT,
    "output" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRun_createdAt_idx" ON "AiRun"("createdAt");

-- CreateIndex
CREATE INDEX "AiRun_entityType_entityId_idx" ON "AiRun"("entityType", "entityId");

