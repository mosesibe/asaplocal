-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsentSource" TEXT,
ADD COLUMN     "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingSms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unsubscribeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

