-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "totalCompletions" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QuestCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT,
    "category" "QuestCategory" NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestCompletion_userId_completedAt_idx" ON "QuestCompletion"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "QuestCompletion_questId_idx" ON "QuestCompletion"("questId");

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill : les quêtes déjà terminées entrent dans l'historique pour que les
-- statistiques (complétions, XP, graphiques) restent exactes après le passage
-- au reset quotidien.
UPDATE "Quest" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE' AND "completedAt" IS NULL;

INSERT INTO "QuestCompletion" ("id", "userId", "questId", "category", "xpAwarded", "completedAt")
SELECT gen_random_uuid()::text, "userId", "id", "category", "xpAwarded", "completedAt"
FROM "Quest"
WHERE "status" = 'DONE';

UPDATE "Quest" SET "totalCompletions" = 1 WHERE "status" = 'DONE';
