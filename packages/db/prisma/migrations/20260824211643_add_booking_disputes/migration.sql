-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_DISPUTED';
ALTER TYPE "NotificationType" ADD VALUE 'DISPUTE_RESOLVED';

-- CreateTable
CREATE TABLE "BookingDispute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL,
    "raisedById" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "photos" TEXT[],
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "providerResponse" TEXT,
    "providerPhotos" TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingDispute_bookingId_idx" ON "BookingDispute"("bookingId");

-- CreateIndex
CREATE INDEX "BookingDispute_status_idx" ON "BookingDispute"("status");

-- AddForeignKey
ALTER TABLE "BookingDispute" ADD CONSTRAINT "BookingDispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDispute" ADD CONSTRAINT "BookingDispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
