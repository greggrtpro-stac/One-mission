-- CreateEnum
CREATE TYPE "CoachRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterTable
ALTER TABLE "Addiction" ADD COLUMN     "shareJournal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "addictionId" TEXT NOT NULL,
    "role" "CoachRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachMessage_addictionId_createdAt_idx" ON "CoachMessage"("addictionId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_addictionId_fkey" FOREIGN KEY ("addictionId") REFERENCES "Addiction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
