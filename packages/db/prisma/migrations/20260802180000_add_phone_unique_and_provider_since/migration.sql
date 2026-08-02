-- AlterTable
ALTER TABLE "User" ADD COLUMN     "providerSince" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

