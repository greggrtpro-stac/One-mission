/**
 * Abonnements — source de vérité unique (client + serveur).
 *
 * Tout le catalogue vit ici : niveaux, prix, fonctionnalités et règles
 * d'accès. Ajouter une fonctionnalité premium = ajouter une entrée dans
 * FEATURES ; le comparatif, les cartes de pricing et le middleware de
 * permissions la prennent en compte automatiquement.
 */

// ── Niveaux d'abonnement ─────────────────────────────────────

export const PLAN_TIERS = ['STARTER', 'PRO', 'MAX'] as const
export type PlanTier = (typeof PLAN_TIERS)[number]

/** Ordre de comparaison des offres (upgrade / downgrade). */
export const PLAN_RANK: Record<PlanTier, number> = {
  STARTER: 0,
  PRO: 1,
  MAX: 2,
}

export const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]

export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'

// ── Catalogue des offres ─────────────────────────────────────

export interface PlanDef {
  tier: PlanTier
  name: string
  /** Courte description affichée sur la carte. */
  tagline: string
  /** Prix en euros — modifiables ici, répercutés partout. */
  priceMonthly: number
  /** Prix total par an en facturation annuelle (remise incluse). */
  priceYearly: number
  /** Mise en avant visuelle (badge « Le plus populaire »). */
  popular?: boolean
}

export const PLANS: Record<PlanTier, PlanDef> = {
  STARTER: {
    tier: 'STARTER',
    name: 'Starter',
    tagline: 'Pose les fondations de ta discipline, gratuitement.',
    priceMonthly: 0,
    priceYearly: 0,
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro',
    tagline: 'Passe au niveau supérieur avec l’IA et le suivi avancé.',
    priceMonthly: 4.99,
    priceYearly: 49.9, // ≈ 2 mois offerts
    popular: true,
  },
  MAX: {
    tier: 'MAX',
    name: 'Max',
    tagline: 'L’arsenal complet : coach IA personnel et support prioritaire.',
    priceMonthly: 9.99,
    priceYearly: 99.9, // ≈ 2 mois offerts
  },
}

export const PLAN_LIST: PlanDef[] = PLAN_TIERS.map((t) => PLANS[t])

// ── Fonctionnalités & permissions ────────────────────────────

export type FeatureKey =
  | 'quests'
  | 'main_quest'
  | 'weekly_quests'
  | 'deepwork'
  | 'journal'
  | 'leaderboard'
  | 'addictions'
  | 'journal_ai'
  | 'advanced_stats'
  | 'coach_ai'
  | 'coach_auto_messages'
  | 'priority_support'

export interface FeatureDef {
  key: FeatureKey
  label: string
  description: string
  /** Offre minimale qui débloque la fonctionnalité. */
  minPlan: PlanTier
}

/** Catalogue ordonné — l'ordre est celui du tableau comparatif. */
export const FEATURES: FeatureDef[] = [
  {
    key: 'quests',
    label: 'Quêtes quotidiennes illimitées',
    description: 'Crée autant de quêtes que tu veux, avec XP et niveaux.',
    minPlan: 'STARTER',
  },
  {
    key: 'main_quest',
    label: 'Quête principale',
    description: 'Ton grand objectif de vie, découpé en jalons.',
    minPlan: 'STARTER',
  },
  {
    key: 'weekly_quests',
    label: 'Quêtes hebdomadaires',
    description: 'Tes rituels de la semaine, récompensés chaque lundi.',
    minPlan: 'STARTER',
  },
  {
    key: 'deepwork',
    label: 'Sessions DeepWork',
    description: 'Timer de concentration profonde avec statistiques.',
    minPlan: 'STARTER',
  },
  {
    key: 'journal',
    label: 'Journal quotidien',
    description: 'Écris et relis tes journées, jour après jour.',
    minPlan: 'STARTER',
  },
  {
    key: 'leaderboard',
    label: 'Classement mondial',
    description: 'Compare ta progression à celle des autres joueurs.',
    minPlan: 'STARTER',
  },
  {
    key: 'addictions',
    label: 'Suivi d’addictions',
    description: 'Compteurs de jours, records et historique des rechutes.',
    minPlan: 'PRO',
  },
  {
    key: 'journal_ai',
    label: 'Analyse IA du journal',
    description: 'Une analyse honnête de chaque journée, notée sur 10.',
    minPlan: 'PRO',
  },
  {
    key: 'advanced_stats',
    label: 'Statistiques avancées',
    description: 'Graphiques d’activité, tendances et catégories sur le profil.',
    minPlan: 'PRO',
  },
  {
    key: 'coach_ai',
    label: 'Coach IA personnel',
    description: 'Un coach dédié par addiction, qui connaît ton parcours.',
    minPlan: 'MAX',
  },
  {
    key: 'coach_auto_messages',
    label: 'Messages automatiques du coach',
    description: 'Encouragements aux jalons et soutien après une rechute.',
    minPlan: 'MAX',
  },
  {
    key: 'priority_support',
    label: 'Support prioritaire',
    description: 'Tes demandes passent en tête de file.',
    minPlan: 'MAX',
  },
]

const FEATURE_BY_KEY = new Map(FEATURES.map((f) => [f.key, f]))

export function getFeature(key: FeatureKey): FeatureDef {
  const feature = FEATURE_BY_KEY.get(key)
  if (!feature) throw new Error(`Fonctionnalité inconnue : ${key}`)
  return feature
}

/** L'offre `plan` inclut-elle la fonctionnalité `key` ? */
export function planIncludes(plan: PlanTier, key: FeatureKey): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[getFeature(key).minPlan]
}

/** Offre minimale requise pour une fonctionnalité. */
export function requiredPlanFor(key: FeatureKey): PlanTier {
  return getFeature(key).minPlan
}

/** Fonctionnalités incluses dans une offre (dans l'ordre du catalogue). */
export function featuresOf(plan: PlanTier): FeatureDef[] {
  return FEATURES.filter((f) => planIncludes(plan, f.key))
}

/** Fonctionnalités encore verrouillées pour une offre. */
export function lockedFeaturesOf(plan: PlanTier): FeatureDef[] {
  return FEATURES.filter((f) => !planIncludes(plan, f.key))
}

// ── DTOs (contrat client/serveur) ────────────────────────────

export type SubscriptionEventType =
  | 'CREATED'
  | 'UPGRADED'
  | 'DOWNGRADED'
  | 'CYCLE_CHANGED'
  | 'RENEWED'
  | 'CANCELED'
  | 'REACTIVATED'
  | 'EXPIRED'

export interface SubscriptionEventDto {
  id: string
  type: SubscriptionEventType
  fromPlan: PlanTier | null
  toPlan: PlanTier
  createdAt: string
}

export interface SubscriptionDto {
  plan: PlanTier
  status: SubscriptionStatus
  billingCycle: BillingCycle
  startedAt: string
  /** Prochaine date de renouvellement (null tant que la facturation n'est pas branchée sur un cas particulier). */
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEndsAt: string | null
  promoCode: string | null
  /** Historique des changements, du plus récent au plus ancien. */
  events: SubscriptionEventDto[]
}

/** Corps de l'erreur 403 renvoyée quand une fonctionnalité est verrouillée. */
export interface UpgradeRequiredDetails {
  feature: FeatureKey
  requiredPlan: PlanTier
  currentPlan: PlanTier
}
