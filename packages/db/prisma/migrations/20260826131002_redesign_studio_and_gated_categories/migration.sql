-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('KITCHEN', 'BATHROOM', 'BEDROOM', 'LIVING_ROOM', 'DINING_ROOM', 'LOFT', 'BASEMENT', 'GARAGE', 'HALLWAY', 'HOME_OFFICE', 'GARDEN', 'OUTDOOR_OTHER', 'COMMERCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DesignSessionStatus" AS ENUM ('ANALYSING', 'GENERATING', 'READY', 'SELECTED', 'POSTED', 'FAILED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "minTrustTier" "TrustTier",
ADD COLUMN     "requiredBusinessTypes" "BusinessType"[] DEFAULT ARRAY[]::"BusinessType"[],
ADD COLUMN     "requiresInsuranceTypes" "InsuranceType"[] DEFAULT ARRAY[]::"InsuranceType"[];

-- AlterTable
ALTER TABLE "JobRequest" ADD COLUMN     "designRenderUrl" TEXT;

-- CreateTable
CREATE TABLE "DesignStudioSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "sourcePhotos" TEXT[],
    "heroPhotoUrl" TEXT NOT NULL,
    "spaceType" "SpaceType" NOT NULL DEFAULT 'OTHER',
    "briefText" TEXT,
    "analysis" JSONB,
    "concepts" JSONB NOT NULL DEFAULT '[]',
    "selectedIndex" INTEGER,
    "status" "DesignSessionStatus" NOT NULL DEFAULT 'ANALYSING',
    "failureReason" TEXT,
    "estimateMinPence" INTEGER,
    "estimateMaxPence" INTEGER,
    "estimateDurationDays" INTEGER,
    "aiCostPence" INTEGER NOT NULL DEFAULT 0,
    "jobRequestId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignStudioSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesignStudioSession_jobRequestId_key" ON "DesignStudioSession"("jobRequestId");

-- CreateIndex
CREATE INDEX "DesignStudioSession_customerId_idx" ON "DesignStudioSession"("customerId");

-- CreateIndex
CREATE INDEX "DesignStudioSession_status_idx" ON "DesignStudioSession"("status");

-- CreateIndex
CREATE INDEX "DesignStudioSession_createdAt_idx" ON "DesignStudioSession"("createdAt");

-- AddForeignKey
ALTER TABLE "DesignStudioSession" ADD CONSTRAINT "DesignStudioSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignStudioSession" ADD CONSTRAINT "DesignStudioSession_jobRequestId_fkey" FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
