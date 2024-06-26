/*
  Warnings:

  - Added the required column `sessionExpiry` to the `Contractor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contractor" ADD COLUMN     "sessionExpiry" TIMESTAMP(3) NOT NULL;
