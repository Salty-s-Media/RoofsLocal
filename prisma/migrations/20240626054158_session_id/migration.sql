/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Contractor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `Contractor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `Contractor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contractor" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_email_key" ON "Contractor"("email");
