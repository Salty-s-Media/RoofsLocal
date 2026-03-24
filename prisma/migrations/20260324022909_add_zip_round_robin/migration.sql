-- CreateTable
CREATE TABLE "ZipRoundRobin" (
    "zipCode" TEXT NOT NULL,
    "lastIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ZipRoundRobin_pkey" PRIMARY KEY ("zipCode")
);
