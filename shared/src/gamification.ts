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
