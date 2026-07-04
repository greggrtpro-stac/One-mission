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

export interface MainQuestDto {
  id: string
  title: string
  description: string | null
  targetDate: string | null
  progress: number
  milestones: MainQuestMilestone[]
  createdAt: string
}
