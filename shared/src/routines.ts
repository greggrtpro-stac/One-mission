/**
 * Routines — suivi d'habitudes quotidiennes, indépendant des quêtes.
 * Aucune XP n'est attribuée : ces types ne portent jamais de champ lié à la
 * gamification (contrairement à QuestDto / WeeklyQuestDto).
 */

export const ROUTINE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
export type RoutineDay = (typeof ROUTINE_DAYS)[number]

export const ROUTINE_DAY_LABELS: Record<RoutineDay, string> = {
  MON: 'Lundi',
  TUE: 'Mardi',
  WED: 'Mercredi',
  THU: 'Jeudi',
  FRI: 'Vendredi',
  SAT: 'Samedi',
  SUN: 'Dimanche',
}

export const ROUTINE_DAY_SHORT: Record<RoutineDay, string> = {
  MON: 'Lun',
  TUE: 'Mar',
  WED: 'Mer',
  THU: 'Jeu',
  FRI: 'Ven',
  SAT: 'Sam',
  SUN: 'Dim',
}

export interface RoutineTaskDto {
  id: string
  title: string
  sortOrder: number
  /** Cases cochées pour la semaine courante uniquement. */
  checked: Record<RoutineDay, boolean>
}

export interface RoutineSectionDto {
  id: string
  title: string
  icon: string | null
  sortOrder: number
  tasks: RoutineTaskDto[]
}

export interface RoutineWeekStats {
  /** Lundi de la semaine courante (YYYY-MM-DD). */
  weekStart: string
  checkedCount: number
  totalCount: number
  /** 0–100, arrondi. */
  percent: number
  /**
   * Semaines consécutives (hors semaine en cours, pas encore terminée) où au
   * moins 80 % de la routine a été réalisée.
   */
  currentStreak: number
}

export interface RoutineOverviewResponse {
  sections: RoutineSectionDto[]
  stats: RoutineWeekStats
}
