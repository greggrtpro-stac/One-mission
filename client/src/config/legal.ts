/**
 * ─────────────────────────────────────────────────────────────
 * Informations légales du site — À COMPLÉTER PAR L'ÉDITEUR
 * ─────────────────────────────────────────────────────────────
 * Toutes les valeurs entre crochets « [À COMPLÉTER — …] » sont des
 * emplacements à renseigner : AUCUNE donnée n'a été inventée.
 * Les pages Mentions légales, Politique de confidentialité et Cookies
 * lisent ce fichier : modifier une valeur ici met à jour tout le site.
 *
 * Les champs marqués (optionnel) peuvent rester à null : la ligne
 * correspondante ne sera pas affichée.
 */

export const LEGAL = {
  /** Nom commercial du site. */
  siteName: 'One Mission',
  /** URL publique du site (sans / final). */
  siteUrl: '[À COMPLÉTER — URL du site, ex. https://onemission.fr]',

  editor: {
    /** Raison sociale (ou nom + prénom pour un entrepreneur individuel). */
    name: '[À COMPLÉTER — raison sociale ou nom de l’éditeur]',
    /** Forme juridique : SAS, SARL, EI, micro-entreprise, association… */
    legalForm: '[À COMPLÉTER — forme juridique]',
    /** Capital social — obligatoire pour les sociétés. null si entrepreneur individuel. */
    shareCapital: '[À COMPLÉTER — capital social, ex. 1 000 €]' as string | null,
    /** Adresse du siège social (ou domicile professionnel). */
    address: '[À COMPLÉTER — adresse du siège social]',
    /** Numéro SIRET (14 chiffres). */
    siret: '[À COMPLÉTER — SIRET]',
    /** RCS : ville d’immatriculation + numéro. null si non immatriculé au RCS. */
    rcs: '[À COMPLÉTER — RCS, ex. RCS Paris 000 000 000]' as string | null,
    /** Numéro de TVA intracommunautaire. null si non assujetti. */
    vatNumber: '[À COMPLÉTER — n° TVA intracommunautaire]' as string | null,
    /** E-mail de contact affiché sur le site. */
    email: '[À COMPLÉTER — e-mail de contact]',
    /** Téléphone de contact — obligatoire dans les mentions légales. */
    phone: '[À COMPLÉTER — téléphone de contact]',
  },

  /** Directeur / directrice de la publication (souvent le représentant légal). */
  publicationDirector: '[À COMPLÉTER — nom du directeur de la publication]',

  host: {
    name: '[À COMPLÉTER — nom de l’hébergeur]',
    address: '[À COMPLÉTER — adresse de l’hébergeur]',
    /** Téléphone ou site web de l’hébergeur. */
    contact: '[À COMPLÉTER — téléphone ou site de l’hébergeur]',
  },

  privacy: {
    /**
     * Point de contact pour l'exercice des droits RGPD.
     * Si un DPO est désigné, indiquer ses coordonnées ici.
     */
    contactEmail: '[À COMPLÉTER — e-mail pour les demandes RGPD]',
    /** true si un délégué à la protection des données est désigné. */
    hasDpo: false,
  },

  /** Date de dernière mise à jour des documents juridiques. */
  lastUpdated: '7 juillet 2026',
} as const

/** Détecte les valeurs encore non renseignées (affichage d'un avertissement). */
export function isPlaceholder(value: string | null): boolean {
  return typeof value === 'string' && value.startsWith('[À COMPLÉTER')
}
