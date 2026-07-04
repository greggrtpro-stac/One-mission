/** Formes des objets renvoyés par l'API (contrat client/serveur). */

export interface PublicUser {
  id: string
  email: string
  username: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  theme: string
  level: number
  totalXp: number
  currentXp: number
  currentStreak: number
  longestStreak: number
  hasPassword: boolean
  createdAt: string
}

export interface AuthResponse {
  user: PublicUser
  accessToken: string
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
  createdAt: string
  relapses: RelapseDto[]
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
