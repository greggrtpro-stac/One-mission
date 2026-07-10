-- Chaque catégorie possède désormais toujours un emoji : les anciennes lignes
-- sans icône reçoivent l'emoji par défaut 📁, puis la colonne devient NOT NULL
-- avec ce même défaut (les créations futures sans icône retombent dessus).
UPDATE "PlanningCategory" SET "icon" = '📁' WHERE "icon" IS NULL;

ALTER TABLE "PlanningCategory" ALTER COLUMN "icon" SET NOT NULL;
ALTER TABLE "PlanningCategory" ALTER COLUMN "icon" SET DEFAULT '📁';
