/**
 * Règles de gamification partagées entre le client et le serveur.
 * Le serveur reste la seule autorité pour ATTRIBUER l'XP ; le client
 * n'utilise ces fonctions que pour l'affichage (barres, prévisions…).
 */

export const DIFFICULTIES = ['TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'EPIC'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  TRIVIAL: 10,
  EASY: 25,
  MEDIUM: 50,
  HARD: 100,
  EPIC: 200,
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  TRIVIAL: 'Très facile',
  EASY: 'Facile',
  MEDIUM: 'Moyenne',
  HARD: 'Difficile',
  EPIC: 'Très difficile',
}

// ── DeepWork ─────────────────────────────────────────────────

/** 1 XP par minute de focus terminée, plafonnée par session. */
export const DEEPWORK_XP_PER_MINUTE = 1
export const DEEPWORK_XP_MAX_PER_SESSION = 200

export function deepworkSessionXp(durationSeconds: number): number {
  return Math.min(
    DEEPWORK_XP_MAX_PER_SESSION,
    Math.round((durationSeconds / 60) * DEEPWORK_XP_PER_MINUTE),
  )
}

// ── Addictions ───────────────────────────────────────────────

/** Paliers d'abstinence (jours) et XP versée quand on les franchit. */
export const ADDICTION_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const

export const XP_BY_MILESTONE: Record<number, number> = {
  1: 10,
  3: 15,
  7: 25,
  14: 40,
  30: 75,
  60: 100,
  90: 150,
  180: 200,
  365: 300,
}

// ── Journal ──────────────────────────────────────────────────

/** XP versée à la première écriture du journal du jour. */
export const JOURNAL_ENTRY_XP = 15

/** XP nécessaire pour passer du niveau `level` au niveau `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

/** XP totale cumulée nécessaire pour ATTEINDRE le niveau `level` (niveau 1 = 0 XP). */
export function totalXpForLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += xpForLevel(l)
  return total
}

export interface LevelProgress {
  level: number
  /** XP accumulée dans le niveau en cours. */
  currentXp: number
  /** XP nécessaire pour atteindre le niveau suivant. */
  xpForNext: number
}

/** Déduit le niveau et la progression à partir de l'XP totale. */
export function levelFromTotalXp(totalXp: number): LevelProgress {
  let level = 1
  let rest = Math.max(0, totalXp)
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level)
    level++
  }
  return { level, currentXp: rest, xpForNext: xpForLevel(level) }
}
