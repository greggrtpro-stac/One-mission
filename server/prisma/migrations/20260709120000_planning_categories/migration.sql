-- CreateTable
CREATE TABLE "PlanningCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanningCategory_userId_name_key" ON "PlanningCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "PlanningCategory_userId_sortOrder_idx" ON "PlanningCategory"("userId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PlanningCategory" ADD CONSTRAINT "PlanningCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (nullable for now — filled by the backfill below, then locked to NOT NULL)
ALTER TABLE "PlanningEvent" ADD COLUMN "categoryId" TEXT;

-- Backfill: chaque paire distincte (userId, category) déjà présente dans
-- PlanningEvent devient une PlanningCategory réelle, et les événements
-- existants sont ré-attachés dessus. "AUTRE" devient la catégorie de repli
-- (isDefault) de chaque utilisateur concerné.
DO $$
DECLARE
  r RECORD;
  new_id TEXT;
  cat_name TEXT;
  cat_color TEXT;
  cat_icon TEXT;
  cat_is_default BOOLEAN;
BEGIN
  FOR r IN SELECT DISTINCT "userId", "category" FROM "PlanningEvent" LOOP
    CASE r."category"
      WHEN 'SPORT' THEN cat_name := 'Sport'; cat_color := '#10B981'; cat_icon := '🏋️';
      WHEN 'TRAVAIL' THEN cat_name := 'Travail'; cat_color := '#F97316'; cat_icon := '💼';
      WHEN 'ETUDES' THEN cat_name := 'Études'; cat_color := '#3B82F6'; cat_icon := '🎓';
      WHEN 'SANTE' THEN cat_name := 'Santé'; cat_color := '#EF4444'; cat_icon := '❤️';
      WHEN 'PERSO' THEN cat_name := 'Personnel'; cat_color := '#EAB308'; cat_icon := '👨‍👩‍👧';
      WHEN 'FINANCE' THEN cat_name := 'Business'; cat_color := '#EC4899'; cat_icon := '💰';
      ELSE cat_name := 'Autre'; cat_color := '#6B7280'; cat_icon := '🗂️';
    END CASE;
    cat_is_default := (r."category" = 'AUTRE');

    new_id := md5(random()::text || clock_timestamp()::text);

    INSERT INTO "PlanningCategory" ("id", "userId", "name", "color", "icon", "isDefault", "sortOrder", "createdAt", "updatedAt")
    VALUES (new_id, r."userId", cat_name, cat_color, cat_icon, cat_is_default, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId", "name") DO UPDATE SET "name" = EXCLUDED."name"
    RETURNING "id" INTO new_id;

    UPDATE "PlanningEvent"
    SET "categoryId" = new_id
    WHERE "userId" = r."userId" AND "category" = r."category";
  END LOOP;
END $$;

-- AlterTable: verrouiller la colonne maintenant que le backfill l'a remplie
ALTER TABLE "PlanningEvent" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "PlanningEvent_categoryId_idx" ON "PlanningEvent"("categoryId");

-- AddForeignKey (Restrict explicite : jamais de suppression silencieuse d'une
-- catégorie encore référencée — voir planning-categories.service.ts#deleteCategory)
ALTER TABLE "PlanningEvent" ADD CONSTRAINT "PlanningEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlanningCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropColumn (l'ancien enum figé et la couleur libre sont remplacés par la catégorie normalisée)
ALTER TABLE "PlanningEvent" DROP COLUMN "category";
ALTER TABLE "PlanningEvent" DROP COLUMN "color";
