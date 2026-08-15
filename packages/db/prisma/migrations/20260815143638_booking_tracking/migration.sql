-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROVIDER_ON_THE_WAY';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "etaMinutes" INTEGER,
ADD COLUMN     "providerLat" DECIMAL(9,6),
ADD COLUMN     "providerLng" DECIMAL(9,6),
ADD COLUMN     "providerLocationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "trackingEnabled" BOOLEAN NOT NULL DEFAULT true;
