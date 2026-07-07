/**
 * Mode bêta — tout se pilote ici.
 * Passer `enabled` à false masque le bandeau sur l'ensemble du site
 * (le bouton « Signaler un bug » reste disponible dans l'application).
 */
export const BETA = {
  enabled: true,
  message:
    'One Mission est actuellement en version bêta. Certaines fonctionnalités peuvent évoluer. ' +
    'Vos retours nous aident à améliorer l’application.',
} as const
