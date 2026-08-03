-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SOLE_TRADER', 'LIMITED_COMPANY', 'PARTNERSHIP', 'SELF_EMPLOYED', 'CHARITY');

-- CreateEnum
CREATE TYPE "IdentityDocType" AS ENUM ('PASSPORT', 'DRIVING_LICENCE', 'NATIONAL_ID');

-- CreateEnum
CREATE TYPE "TrustTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('PUBLIC_LIABILITY', 'PROFESSIONAL_INDEMNITY', 'EMPLOYERS_LIABILITY');

-- CreateEnum
CREATE TYPE "VerificationDocType" AS ENUM ('UTILITY_BILL', 'BUSINESS_BANK_STATEMENT', 'HMRC_CORRESPONDENCE', 'PUBLIC_LIABILITY_INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferenceStatus" AS ENUM ('REQUESTED', 'VERIFIED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "VerificationStatus" ADD VALUE 'MORE_INFO_REQUESTED';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "businessInfoCompletedAt" TIMESTAMP(3),
ADD COLUMN     "businessType" "BusinessType",
ADD COLUMN     "companiesHouseCheckedAt" TIMESTAMP(3),
ADD COLUMN     "companiesHouseDirectorMatch" BOOLEAN,
ADD COLUMN     "companiesHouseSnapshot" JSONB,
ADD COLUMN     "companyDirectorName" TEXT,
ADD COLUMN     "companyRegistrationNumber" TEXT,
ADD COLUMN     "emergencyCalloutsAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languagesSpoken" TEXT[],
ADD COLUMN     "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoUrls" TEXT[],
ADD COLUMN     "platinumOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileCompletedAt" TIMESTAMP(3),
ADD COLUMN     "stripeConnectOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "targetResponseMins" INTEGER,
ADD COLUMN     "tradingName" TEXT,
ADD COLUMN     "trustTier" "TrustTier" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "trustTierUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "utrNumber" TEXT,
ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "workingHours" JSONB;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isRegulatedTrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggestedQualifications" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "docType" "IdentityDocType",
    "stripeVerificationSessionId" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "extractedFullName" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVerificationDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "docType" "VerificationDocType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "issuingBody" TEXT,
    "certificateNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "type" "InsuranceType" NOT NULL,
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "coverageAmountPence" INTEGER NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "expiryReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "categoryId" UUID,
    "title" TEXT,
    "description" TEXT,
    "beforeUrl" TEXT,
    "afterUrl" TEXT,
    "videoUrl" TEXT,
    "photoUrls" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessReference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "refereeName" TEXT NOT NULL,
    "refereeEmail" TEXT NOT NULL,
    "relationshipNote" TEXT,
    "verificationToken" TEXT NOT NULL,
    "status" "ReferenceStatus" NOT NULL DEFAULT 'REQUESTED',
    "testimonial" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_businessId_key" ON "IdentityVerification"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_stripeVerificationSessionId_key" ON "IdentityVerification"("stripeVerificationSessionId");

-- CreateIndex
CREATE INDEX "IdentityVerification_status_idx" ON "IdentityVerification"("status");

-- CreateIndex
CREATE INDEX "BusinessVerificationDocument_businessId_idx" ON "BusinessVerificationDocument"("businessId");

-- CreateIndex
CREATE INDEX "Qualification_businessId_idx" ON "Qualification"("businessId");

-- CreateIndex
CREATE INDEX "Qualification_status_idx" ON "Qualification"("status");

-- CreateIndex
CREATE INDEX "InsurancePolicy_status_idx" ON "InsurancePolicy"("status");

-- CreateIndex
CREATE INDEX "InsurancePolicy_expiryDate_idx" ON "InsurancePolicy"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_businessId_type_key" ON "InsurancePolicy"("businessId", "type");

-- CreateIndex
CREATE INDEX "PortfolioItem_businessId_idx" ON "PortfolioItem"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessReference_verificationToken_key" ON "BusinessReference"("verificationToken");

-- CreateIndex
CREATE INDEX "BusinessReference_businessId_idx" ON "BusinessReference"("businessId");

-- CreateIndex
CREATE INDEX "Business_trustTier_idx" ON "Business"("trustTier");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationDocument" ADD CONSTRAINT "BusinessVerificationDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReference" ADD CONSTRAINT "BusinessReference_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

