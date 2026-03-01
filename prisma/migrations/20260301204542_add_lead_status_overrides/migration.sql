-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW_LEAD', 'APPT_SCHEDULED', 'APPT_COMPLETED', 'NOT_SOLD', 'SOLD', 'DEAD');

-- CreateTable
CREATE TABLE "LeadStatusOverride" (
    "contactId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW_LEAD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadStatusOverride_pkey" PRIMARY KEY ("contactId")
);

-- CreateIndex
CREATE INDEX "LeadStatusOverride_contractorId_idx" ON "LeadStatusOverride"("contractorId");
