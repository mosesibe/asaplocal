-- CreateTable
CREATE TABLE "Payout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payout_businessId_idx" ON "Payout"("businessId");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
