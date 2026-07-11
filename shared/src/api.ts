/** Formes des objets renvoyés par l'API (contrat client/serveur). */

/** Préférences de notifications (architecture prête, envoi réel à venir). */
export interface NotificationPrefs {
  /** Rappels des quêtes qui arrivent à échéance. */
  questReminders: boolean
  /** Récapitulatif hebdomadaire de progression. */
  weeklyRecap: boolean
  /** Messages automatiques du coach IA. */
  coachMessages: boolean
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  questReminders: true,
  weeklyRecap: true,
  coachMessages: true,
}

export const LANGUAGES = ['fr', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

// ── Communication & notifications (marketing, opt-in RGPD) ───

/**
 * Préférences de communication marketing, indépendantes des notifications
 * produit ci-dessus. `accountSecurity` reste toujours vrai : ces e-mails
 * (connexion, mot de passe, vérification, abonnement…) protègent le compte
 * et ne sont jamais désactivables, ni côté client ni côté serveur.
 */
export interface CommunicationPrefs {
  /** Nouveautés de One Mission. */
  productUpdates: boolean
  /** Conseils de productivité. */
  productivityTips: boolean
  /** Annonces des nouvelles fonctionnalités. */
  featureAnnouncements: boolean
  /** Offres promotionnelles. */
  promotionalOffers: boolean
  /** Toujours vrai — e-mails de sécurité du compte. */
  accountSecurity: boolean
}

/** Opt-in RGPD : tout est désactivé par défaut, sauf la sécurité du compte. */
export const DEFAULT_COMMUNICATION_PREFS: CommunicationPrefs = {
  productUpdates: false,
  productivityTips: false,
  featureAnnouncements: false,
  promotionalOffers: false,
  accountSecurity: true,
}

/**
 * Une ligne de l'historique des communications — structure préparée pour un
 * futur envoi réel (voir server/src/lib/marketingProvider.ts) : rien ne
 * l'alimente encore, la carte « Historique » affiche une liste vide.
 */
export interface CommunicationLogEntry {
  date: string
  type: string
  status: 'sent' | 'opened' | 'failed'
}

export interface PublicUser {
  id: string
  email: string
  username: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  theme: string
  language: Language
  notifications: NotificationPrefs
  showOnLeaderboard: boolean
  /** Confidentialité du système d'amis (voir shared/friends.ts). */
  friendPrefs: import('./friends.js').FriendPrefs
  /** Newsletter One Mission (nouveautés, conseils, annonces) — distincte des préférences ci-dessous. */
  newsletterOptIn: boolean
  communicationPrefs: CommunicationPrefs
  twoFactorEnabled: boolean
  level: number
  totalXp: number
  currentXp: number
  currentStreak: number
  longestStreak: number
  hasPassword: boolean
  /** Compte relié à Google (connexion OAuth possible). */
  hasGoogle: boolean
  createdAt: string
}

export interface AuthResponse {
  user: PublicUser
  accessToken: string
}

// ── Vérification d'e-mail ─────────────────────────────────────

/** Réponse de l'inscription : aucune session, le compte reste inactif tant que l'e-mail n'est pas confirmé. */
export interface RegisterResponse {
  email: string
  message: string
}

export type VerifyEmailStatus = 'success' | 'expired' | 'already_verified' | 'invalid'

export interface VerifyEmailResponse {
  status: VerifyEmailStatus
}

// ── Cloudflare Turnstile ──────────────────────────────────────

export interface TurnstileSiteKeyResponse {
  /** null si l'anti-robot n'est pas configuré côté serveur (développement). */
  siteKey: string | null
}

// ── Bêta : signalements des testeurs ─────────────────────────

export type FeedbackCategory = 'BUG' | 'SUGGESTION' | 'UI' | 'PERFORMANCE' | 'OTHER'
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface FeedbackPayload {
  title: string
  description: string
  category: FeedbackCategory
  priority: FeedbackPriority
  /** Route de l'app où le signalement a été fait. */
  page?: string
  /** Capture d'écran compressée (data-URL image), optionnelle. */
  screenshot?: string
}

// ── Paiement (Stripe Checkout) ───────────────────────────────

/** Adresse de facturation saisie sur la page de paiement. */
export interface BillingDetailsPayload {
  firstName: string
  lastName: string
  address: string
  postalCode: string
  city: string
  /** Code pays ISO 3166-1 alpha-2 (FR, BE, …). */
  country: string
}

export interface CheckoutPayload {
  plan: 'PRO' | 'MAX'
  billingCycle: 'MONTHLY' | 'YEARLY'
  billing: BillingDetailsPayload
}

// ── Appareils connectés ──────────────────────────────────────

export type SessionDevice = 'desktop' | 'mobile' | 'tablet' | 'unknown'

/** Session active du compte (un appareil connecté). */
export interface SessionInfo {
  /** Identifiant stable de la session (survit aux rotations de token). */
  id: string
  device: SessionDevice
  os: string | null
  browser: string | null
  /** Localisation approximative — null si indisponible. */
  location: string | null
  connectedAt: string
  lastActivityAt: string
  isCurrent: boolean
}

export interface SessionsResponse {
  sessions: SessionInfo[]
}

/** Renvoyé par toute action qui rapporte de l'XP. */
export interface XpResult {
  xpGained: number
  totalXp: number
  level: number
  currentXp: number
  xpForNext: number
  leveledUp: boolean
  currentStreak: number
  longestStreak: number
}

// ── Quêtes ───────────────────────────────────────────────────

export interface QuestDto {
  id: string
  title: string
  description: string | null
  category: string
  priority: string
  difficulty: string
  /** Format YYYY-MM-DD. */
  dueDate: string
  /** Format HH:mm, facultatif. */
  dueTime: string | null
  status: string
  progress: number
  xpAwarded: number
  completedAt: string | null
  createdAt: string
}

/** Résultat d'une action sur une quête pouvant rapporter/retirer de l'XP. */
export interface QuestActionResult {
  quest: QuestDto
  xp: XpResult | null
}

export interface MainQuestMilestone {
  id: string
  title: string
  done: boolean
}

export interface WeeklyQuestDto {
  id: string
  title: string
  description: string | null
  difficulty: string
  sortOrder: number
  /** Complétée cette semaine ? (ISO datetime ou null) */
  completedAt: string | null
  totalCompletions: number
  /** Lundi de la semaine courante (YYYY-MM-DD). */
  weekStart: string
}

export interface WeeklyQuestActionResult {
  weeklyQuest: WeeklyQuestDto
  xp: XpResult | null
}

export interface QuoteDto {
  text: string
  author: string | null
}

/** Résumé léger du tableau de bord (le reste vient des endpoints dédiés). */
export interface DashboardSummary {
  quote: QuoteDto
  deepWorkTodaySeconds: number
  /** Meilleure série d'addiction en cours (jours), null si aucune addiction suivie. */
  addictionDays: number | null
  journalWrittenToday: boolean
  questsDoneToday: number
}

// ── DeepWork ─────────────────────────────────────────────────

export interface DeepWorkSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cyclesBeforeLongBreak: number
}

export const DEFAULT_DEEPWORK_SETTINGS: DeepWorkSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
}

export interface DeepWorkSessionDto {
  id: string
  startedAt: string
  duration: number
  kind: string
  completed: boolean
}

export interface DeepWorkStats {
  todaySeconds: number
  weekSeconds: number
  monthSeconds: number
  totalSeconds: number
  sessionsCount: number
  settings: DeepWorkSettings
}

// ── Addictions ───────────────────────────────────────────────

export interface RelapseDto {
  id: string
  occurredAt: string
  streakLost: number
  note: string | null
}

export interface AddictionDto {
  id: string
  name: string
  icon: string | null
  startDate: string
  relapseCount: number
  bestStreak: number
  /** Le coach IA est autorisé à lire le journal. */
  shareJournal: boolean
  createdAt: string
  relapses: RelapseDto[]
}

// ── Coach IA (addictions) ────────────────────────────────────

export interface CoachMessageDto {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

export interface CoachThread {
  messages: CoachMessageDto[]
  aiAvailable: boolean
  shareJournal: boolean
}

// ── Journal ──────────────────────────────────────────────────

/** Analyse IA d'une entrée de journal (générée par Claude). */
export interface JournalAnalysis {
  /** Note de la journée sur 10. */
  score: number
  summary: string
  positives: string[]
  improvements: string[]
  advice: string[]
}

export interface JournalEntryDto {
  id: string
  /** Jour de l'entrée (YYYY-MM-DD). */
  date: string
  content: string
  aiScore: number | null
  aiAnalysis: JournalAnalysis | null
  updatedAt: string
}

// ── Classement ───────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  /** Identifiant du joueur — permet d'ouvrir son profil public. */
  userId: string
  username: string
  avatarUrl: string | null
  level: number
  totalXp: number
  currentStreak: number
  /** Vrai pour la ligne du joueur connecté. */
  isMe: boolean
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  /** Ligne du joueur connecté (même s'il est hors du top). */
  me: LeaderboardEntry
  totalPlayers: number
}

// ── Statistiques du profil ───────────────────────────────────

/** Activité d'un jour local (YYYY-MM-DD). */
export interface ProfileDay {
  date: string
  questsDone: number
  /** XP estimée gagnée ce jour (quêtes + focus + journal). */
  xpGained: number
  focusSeconds: number
  relapses: number
}

/** Quêtes terminées sur une semaine (lundi YYYY-MM-DD). */
export interface ProfileWeek {
  weekStart: string
  questsDone: number
}

export interface CategoryStat {
  category: string
  count: number
}

/** État d'une addiction suivie, pour les graphiques du profil. */
export interface AddictionStreakStat {
  name: string
  icon: string | null
  currentDays: number
  bestDays: number
  relapseCount: number
}

/** Toutes les données de la page Profil (stats, séries, graphiques). */
export interface ProfileStats {
  rank: number
  totalPlayers: number

  questsCreated: number
  questsDone: number
  /** Taux de réussite en % (quêtes terminées / quêtes créées). */
  successRate: number
  mainQuestsDone: number
  weeklyCompletions: number

  focusSeconds: number
  /** Moyenne quotidienne de focus depuis la création du compte. */
  focusAvgSecondsPerDay: number
  deepworkSessions: number
  journalEntries: number

  addictionsCount: number
  relapsesTotal: number
  /** Plus longue période sans rechute, toutes addictions confondues (jours). */
  longestCleanDays: number

  /** 30 derniers jours, du plus ancien à aujourd'hui. */
  days: ProfileDay[]
  /** 12 dernières semaines, de la plus ancienne à la semaine en cours. */
  weeks: ProfileWeek[]
  addictions: AddictionStreakStat[]
  categories: CategoryStat[]
}

// ── Profil public (consultation depuis le classement) ───────

/**
 * Identité publique d'un joueur. Ne contient AUCUNE donnée personnelle :
 * ni e-mail, ni nom réel, ni téléphone, ni paramètres de compte.
 */
export interface PublicPlayer {
  id: string
  username: string
  avatarUrl: string | null
  level: number
  totalXp: number
  currentXp: number
  currentStreak: number
  longestStreak: number
  /** Date d'inscription (affichée sur le profil public). */
  createdAt: string
}

/**
 * Statistiques publiques : sous-ensemble de ProfileStats sans le contenu
 * privé (noms des addictions, nombre de rechutes, répartition par catégorie).
 */
export type PublicProfileStats = Omit<
  ProfileStats,
  'addictions' | 'categories' | 'relapsesTotal' | 'addictionsCount' | 'longestCleanDays'
> & {
  /** null si le joueur a masqué ses statistiques d'addictions (friendPrefs.showAddictionsPublicly). */
  addictionsCount: number | null
  longestCleanDays: number | null
}

/** Réponse de GET /api/leaderboard/:userId — le profil public d'un joueur. */
export interface PublicProfileResponse {
  user: PublicPlayer
  stats: PublicProfileStats
}

export interface MainQuestDto {
  id: string
  title: string
  description: string | null
  targetDate: string | null
  progress: number
  milestones: MainQuestMilestone[]
  createdAt: string
}
