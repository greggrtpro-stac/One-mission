-- Supprime la table Quote et son contenu : la citation du jour est
-- désormais calculée exclusivement côté client (getDailyQuote() dans
-- shared/src/quotes.ts), plus aucun accès serveur/base pour cette
-- fonctionnalité.
DROP TABLE "Quote";
