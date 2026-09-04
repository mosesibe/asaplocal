-- CreateEnum
CREATE TYPE "BackgroundCheckType" AS ENUM ('PERSONAL_CCJ', 'BUSINESS_CCJ', 'FINANCIAL', 'ADVERSE_MEDIA');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "companyIncorporatedAt" TIMESTAMP(3),
ADD COLUMN     "duplicateCheckFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "duplicateCheckMatches" JSONB,
ADD COLUMN     "possibleDirectorDisqualification" BOOLEAN;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "minTradingMonths" INTEGER;

-- CreateTable
CREATE TABLE "BackgroundCheck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "type" "BackgroundCheckType" NOT NULL,
    "provider" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "externalRef" TEXT,
    "resultSummary" JSONB,
    "reviewNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BackgroundCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundCheck_businessId_idx" ON "BackgroundCheck"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundCheck_businessId_type_key" ON "BackgroundCheck"("businessId", "type");

-- AddForeignKey
ALTER TABLE "BackgroundCheck" ADD CONSTRAINT "BackgroundCheck_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
