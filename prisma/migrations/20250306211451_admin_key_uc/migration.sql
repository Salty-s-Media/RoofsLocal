/*
  Warnings:

  - The primary key for the `Admin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `adminKey` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `rotAdminKey` on the `Admin` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key,rkey]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rkey` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_pkey",
DROP COLUMN "adminKey",
DROP COLUMN "rotAdminKey",
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "rkey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_key_rkey_key" ON "Admin"("key", "rkey");
