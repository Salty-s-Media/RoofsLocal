/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Contractor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hubspotKey` to the `Contractor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contractor" ADD COLUMN     "hubspotKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_phone_key" ON "Contractor"("phone");
