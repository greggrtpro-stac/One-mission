-- La vérification d'e-mail devient obligatoire pour se connecter (voir auth.service.ts).
-- Sans ce backfill, TOUS les comptes créés avant cette migration seraient bloqués
-- à la connexion : on les considère vérifiés au moment de leur création, puisqu'ils
-- avaient déjà accès à l'application avant l'introduction de cette exigence.
UPDATE "User"
SET "emailVerifiedAt" = "createdAt"
WHERE "emailVerifiedAt" IS NULL;
