/** Constantes et contrats du Planning (calendrier hebdomadaire), partagés client/serveur. */

import type { XpResult } from './api.js'

export const PLANNING_EVENT_STATUSES = ['PLANNED', 'DONE', 'CANCELLED'] as const
export type PlanningEventStatus = (typeof PLANNING_EVENT_STATUSES)[number]

export const PLANNING_STATUS_LABELS: Record<PlanningEventStatus, string> = {
  PLANNED: 'Planifié',
  DONE: 'Effectué',
  CANCELLED: 'Annulé',
}

/** Palette proposée pour les événements (l'utilisateur choisit librement parmi ces teintes). */
export const EVENT_COLORS = [
  '#6366F1', // indigo
  '#3B82F6', // bleu
  '#06B6D4', // cyan
  '#10B981', // émeraude
  '#F59E0B', // ambre
  '#F97316', // orange
  '#F43F5E', // rose
  '#8B5CF6', // violet
] as const

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0]

/** Options de rappel proposées (minutes avant le début) — envoi réel à venir. */
export const REMINDER_OPTIONS = [5, 10, 15, 30, 60] as const

/** Résumé de la quête liée à un événement (affichage calendrier). */
export interface PlanningEventQuest {
  id: string
  title: string
  status: string
  difficulty: string
}

export interface PlanningEventDto {
  id: string
  title: string
  description: string | null
  notes: string | null
  /** Couleur hex "#RRGGBB". */
  color: string
  category: string
  priority: string
  /** ISO datetime (UTC). */
  startAt: string
  /** ISO datetime (UTC), strictement après startAt. */
  endAt: string
  status: PlanningEventStatus
  questId: string | null
  /** Renseigné si l'événement est lié à une quête. */
  quest: PlanningEventQuest | null
  /** Minutes avant startAt, null = pas de rappel (architecture prête). */
  reminderMinutes: number | null
  createdAt: string
}

/** Résultat d'une action sur un événement pouvant impacter l'XP (quête liée). */
export interface PlanningEventActionResult {
  event: PlanningEventDto
  xp: XpResult | null
}

/** Temps planifié/effectué par catégorie (minutes). */
export interface PlanningCategoryStat {
  category: string
  plannedMinutes: number
  doneMinutes: number
}

/** Statistiques du Planning sur une plage donnée. */
export interface PlanningStats {
  /** Minutes planifiées (événements non annulés). */
  plannedMinutes: number
  /** Minutes des événements marqués effectués. */
  doneMinutes: number
  /** Taux de respect du planning en % (effectué / planifié). */
  adherenceRate: number
  eventsCount: number
  eventsDone: number
  categories: PlanningCategoryStat[]
}
