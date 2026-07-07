/**
 * Nouveautés (changelog) — ajouter une version = ajouter une entrée EN TÊTE
 * du tableau. La page /app/changelog se met à jour toute seule.
 */

export type ChangeType = 'new' | 'improvement' | 'fix'

export interface ChangelogVersion {
  version: string
  /** Date de publication, au format AAAA-MM-JJ. */
  date: string
  title: string
  changes: { type: ChangeType; text: string }[]
}

export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '0.4',
    date: '2026-07-07',
    title: 'Confidentialité, appareils connectés et préparation de la bêta',
    changes: [
      { type: 'new', text: 'Paramètres → Appareils connectés : visualise chaque session (appareil, navigateur, dernière activité) et déconnecte-les individuellement ou toutes.' },
      { type: 'new', text: 'Option de confidentialité « Afficher mon profil dans le classement public », modifiable à tout moment.' },
      { type: 'new', text: 'Pages Mentions légales, Politique de confidentialité et Gestion des cookies, avec bannière de consentement.' },
      { type: 'new', text: 'Téléchargement de toutes tes données (RGPD) depuis les Paramètres.' },
      { type: 'new', text: 'Bouton « Signaler un bug » et page Nouveautés pour la bêta.' },
      { type: 'improvement', text: 'Application nettement plus rapide au premier chargement (pages chargées à la demande).' },
      { type: 'improvement', text: 'Le bouton « Continuer avec Google » ne contacte Google qu’au clic.' },
    ],
  },
  {
    version: '0.3',
    date: '2026-07-06',
    title: 'Planning hebdomadaire',
    changes: [
      { type: 'new', text: 'Onglet Planning : calendrier de la semaine, événements liés aux quêtes, mini-calendrier pour changer de semaine.' },
      { type: 'new', text: 'Quêtes hebdomadaires : bouton « Nouvelle semaine » pour relancer le cycle manuellement.' },
      { type: 'improvement', text: 'Navigation épurée : Profil et Paramètres accessibles depuis la carte de profil.' },
    ],
  },
  {
    version: '0.2',
    date: '2026-07-05',
    title: 'Offres et robustesse',
    changes: [
      { type: 'new', text: 'Page Level Up : choisis ton offre (Starter, Pro, Max) et ton cycle de facturation.' },
      { type: 'improvement', text: 'Page d’erreur propre en cas de problème de chargement au lieu d’un écran vide.' },
    ],
  },
  {
    version: '0.1',
    date: '2026-07-04',
    title: 'Naissance de One Mission',
    changes: [
      { type: 'new', text: 'Quêtes quotidiennes avec XP, niveaux et séries d’activité.' },
      { type: 'new', text: 'DeepWork (sessions de concentration), suivi d’addictions avec coach IA, journal analysé par IA.' },
      { type: 'new', text: 'Classement des joueurs, profil avec statistiques et graphiques.' },
    ],
  },
]
