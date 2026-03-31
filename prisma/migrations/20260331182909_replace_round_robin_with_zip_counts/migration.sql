/*
  Warnings:

  - You are about to drop the `ZipRoundRobin` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ZipRoundRobin";

-- CreateTable
CREATE TABLE "ContractorZipCount" (
    "contractorId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorZipCount_pkey" PRIMARY KEY ("contractorId","zipCode")
);

-- CreateIndex
CREATE INDEX "ContractorZipCount_zipCode_idx" ON "ContractorZipCount"("zipCode");

-- AddForeignKey
ALTER TABLE "ContractorZipCount" ADD CONSTRAINT "ContractorZipCount_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
