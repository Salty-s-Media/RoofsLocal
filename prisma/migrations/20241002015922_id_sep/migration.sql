/*
  Warnings:

  - A unique constraint covering the columns `[stripeSessionId]` on the table `Contractor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Contractor" ADD COLUMN     "stripeSessionId" TEXT NOT NULL DEFAULT '';
