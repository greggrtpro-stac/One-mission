-- CreateEnum
CREATE TYPE "PlanningEventStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "PlanningEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "category" "QuestCategory" NOT NULL DEFAULT 'AUTRE',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "PlanningEventStatus" NOT NULL DEFAULT 'PLANNED',
    "questId" TEXT,
    "reminderMinutes" INTEGER,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanningEvent_questId_key" ON "PlanningEvent"("questId");

-- CreateIndex
CREATE INDEX "PlanningEvent_userId_startAt_idx" ON "PlanningEvent"("userId", "startAt");

-- AddForeignKey
ALTER TABLE "PlanningEvent" ADD CONSTRAINT "PlanningEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningEvent" ADD CONSTRAINT "PlanningEvent_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
