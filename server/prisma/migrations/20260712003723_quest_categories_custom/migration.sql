-- Catégories de quêtes personnalisées : remplace l'enum figé "QuestCategory"
-- par une table de catégories par utilisateur (même modèle que le Planning),
-- en préservant toutes les quêtes et complétions existantes.
--
-- Étapes : renommer l'enum pour libérer le nom → créer la table → backfiller
-- le jeu de catégories par défaut pour chaque utilisateur ayant des quêtes →
-- mapper chaque quête/complétion sur la catégorie du même nom → verrouiller
-- (NOT NULL + FK) → supprimer les anciennes colonnes et l'enum.
-- Le SET NOT NULL échouerait si une quête restait sans catégorie : la
-- migration s'interrompt alors sans perte plutôt que de deviner.

-- 1. Libérer le nom "QuestCategory" (types et tables partagent le même espace
--    de noms dans Postgres).
ALTER TYPE "QuestCategory" RENAME TO "QuestCategoryOld";

-- 2. Nouvelle table (DDL identique à celui que Prisma génère pour le modèle).
CREATE TABLE "QuestCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📁',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuestCategory_userId_sortOrder_idx" ON "QuestCategory"("userId", "sortOrder");

CREATE UNIQUE INDEX "QuestCategory_userId_name_key" ON "QuestCategory"("userId", "name");

ALTER TABLE "QuestCategory" ADD CONSTRAINT "QuestCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Backfill : le jeu complet de catégories par défaut (les mêmes que
--    DEFAULT_QUEST_CATEGORIES de quest-categories.service.ts, à garder en
--    correspondance) pour chaque utilisateur ayant déjà des quêtes ou des
--    complétions. Les autres utilisateurs les recevront paresseusement au
--    premier accès à la liste.
INSERT INTO "QuestCategory" ("id", "userId", "name", "color", "icon", "isDefault", "sortOrder", "updatedAt")
SELECT gen_random_uuid()::text, u."userId", d.name, d.color, d.icon, d."isDefault", d."sortOrder", CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "userId" FROM "Quest"
    UNION
    SELECT DISTINCT "userId" FROM "QuestCompletion"
) AS u
CROSS JOIN (VALUES
    ('Sport',     '💪', '#F97316', false, 0),
    ('Travail',   '💼', '#3B82F6', false, 1),
    ('Études',    '📚', '#10B981', false, 2),
    ('Santé',     '❤️', '#EF4444', false, 3),
    ('Personnel', '🎯', '#8B5CF6', false, 4),
    ('Finance',   '💰', '#EAB308', false, 5),
    ('Autre',     '📁', '#6B7280', true,  6)
) AS d(name, icon, color, "isDefault", "sortOrder");

-- 4. Quest : mapper l'ancien enum sur la catégorie du même nom, puis verrouiller.
ALTER TABLE "Quest" ADD COLUMN "categoryId" TEXT;

UPDATE "Quest" q
SET "categoryId" = qc."id"
FROM (VALUES
    ('SPORT', 'Sport'),
    ('TRAVAIL', 'Travail'),
    ('ETUDES', 'Études'),
    ('SANTE', 'Santé'),
    ('PERSO', 'Personnel'),
    ('FINANCE', 'Finance'),
    ('AUTRE', 'Autre')
) AS m(enum_value, name)
JOIN "QuestCategory" qc ON qc."name" = m.name
WHERE qc."userId" = q."userId" AND q."category"::text = m.enum_value;

ALTER TABLE "Quest" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Quest" DROP COLUMN "category";

CREATE INDEX "Quest_categoryId_idx" ON "Quest"("categoryId");

ALTER TABLE "Quest" ADD CONSTRAINT "Quest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. QuestCompletion : même mapping, mais nullable (l'historique survit à la
--    suppression de sa catégorie, comme à celle de sa quête).
ALTER TABLE "QuestCompletion" ADD COLUMN "categoryId" TEXT;

UPDATE "QuestCompletion" c
SET "categoryId" = qc."id"
FROM (VALUES
    ('SPORT', 'Sport'),
    ('TRAVAIL', 'Travail'),
    ('ETUDES', 'Études'),
    ('SANTE', 'Santé'),
    ('PERSO', 'Personnel'),
    ('FINANCE', 'Finance'),
    ('AUTRE', 'Autre')
) AS m(enum_value, name)
JOIN "QuestCategory" qc ON qc."name" = m.name
WHERE qc."userId" = c."userId" AND c."category"::text = m.enum_value;

ALTER TABLE "QuestCompletion" DROP COLUMN "category";

CREATE INDEX "QuestCompletion_categoryId_idx" ON "QuestCompletion"("categoryId");

ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. L'ancien enum n'est plus référencé nulle part.
DROP TYPE "QuestCategoryOld";
