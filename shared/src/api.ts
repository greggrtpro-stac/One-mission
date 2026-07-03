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
}
