-- Sessions « Appareils connectés » : identifiant stable à travers les
-- rotations de refresh token + métadonnées d'appareil.
ALTER TABLE "RefreshToken" ADD COLUMN "familyId" TEXT;
UPDATE "RefreshToken" SET "familyId" = "id" WHERE "familyId" IS NULL;
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;

ALTER TABLE "RefreshToken" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "ip" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RefreshToken" ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
