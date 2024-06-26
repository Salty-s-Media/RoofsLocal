/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `Contractor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contractor_sessionId_key" ON "Contractor"("sessionId");
