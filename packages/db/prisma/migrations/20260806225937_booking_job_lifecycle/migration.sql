-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_APPROVAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_AWAITING_APPROVAL';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_COMPLETED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "JobSheetEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSheetEntry_bookingId_idx" ON "JobSheetEntry"("bookingId");

-- AddForeignKey
ALTER TABLE "JobSheetEntry" ADD CONSTRAINT "JobSheetEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
