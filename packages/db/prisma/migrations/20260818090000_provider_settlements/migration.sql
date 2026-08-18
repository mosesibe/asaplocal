-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('STRIPE_CONNECT', 'MANUAL');

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_createdById_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "platformFeePence" INTEGER,
ADD COLUMN     "providerNetPence" INTEGER,
ADD COLUMN     "settledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "bookingId" UUID,
ADD COLUMN     "platformFeePence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeTransferId" TEXT,
DROP COLUMN "method",
ADD COLUMN     "method" "PayoutMethod" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripeTransferId_key" ON "Payout"("stripeTransferId");

-- CreateIndex
CREATE INDEX "Payout_bookingId_idx" ON "Payout"("bookingId");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

