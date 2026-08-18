-- CreateEnum
CREATE TYPE "VariationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'VARIATION_PROPOSED';
ALTER TYPE "NotificationType" ADD VALUE 'VARIATION_DECIDED';

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'BOOKING_BALANCE';

-- CreateTable
CREATE TABLE "BookingVariation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "photos" TEXT[],
    "status" "VariationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingVariation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingVariation_bookingId_status_idx" ON "BookingVariation"("bookingId", "status");

-- AddForeignKey
ALTER TABLE "BookingVariation" ADD CONSTRAINT "BookingVariation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
