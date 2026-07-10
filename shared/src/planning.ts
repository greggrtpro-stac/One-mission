/** Constantes et contrats du Planning (calendrier hebdomadaire), partagés client/serveur. */

import type { XpResult } from './api.js'

export const PLANNING_EVENT_STATUSES = ['PLANNED', 'DONE', 'CANCELLED'] as const
export type PlanningEventStatus = (typeof PLANNING_EVENT_STATUSES)[number]

export const PLANNING_STATUS_LABELS: Record<PlanningEventStatus, string> = {
  PLANNED: 'Planifié',
  DONE: 'Effectué',
  CANCELLED: 'Annulé',
}

/**
 * Palette d'attribution automatique des couleurs de catégorie : quand
 * l'utilisateur crée une catégorie sans choisir de couleur, on lui attribue
 * la première de cette liste non encore utilisée par une de ses catégories
 * existantes (on reboucle une fois les 9 épuisées). Toujours proposée aussi
 * comme choix rapide dans le sélecteur de couleur du gestionnaire.
 */
export const AUTO_CATEGORY_COLORS = [
  { name: 'Orange', hex: '#F97316' },
  { name: 'Bleu', hex: '#3B82F6' },
  { name: 'Vert', hex: '#10B981' },
  { name: 'Rouge', hex: '#EF4444' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Jaune', hex: '#EAB308' },
  { name: 'Turquoise', hex: '#06B6D4' },
  { name: 'Gris', hex: '#6B7280' },
] as const

/** Couleur présélectionnée à la création d'une catégorie (bleu moderne, modifiable). */
export const DEFAULT_CATEGORY_COLOR = '#3B82F6'

/** Emoji attribué à toute catégorie qui n'en a pas explicitement reçu. */
export const DEFAULT_CATEGORY_ICON = '📁'

/** Options de rappel proposées (minutes avant le début) — envoi réel à venir. */
export const REMINDER_OPTIONS = [5, 10, 15, 30, 60] as const

/** Résumé de la quête liée à un événement (affichage calendrier). */
export interface PlanningEventQuest {
  id: string
  title: string
  status: string
  difficulty: string
}

/** Catégorie de planning telle qu'embarquée dans un événement (couleur/icône incluses). */
export interface PlanningEventCategory {
  id: string
  name: string
  /** Couleur hex "#RRGGBB". */
  color: string
  /** Emoji, jamais vide (📁 par défaut). */
  icon: string
}

export interface PlanningEventDto {
  id: string
  title: string
  description: string | null
  notes: string | null
  /** La couleur affichée est toujours celle de la catégorie — jamais stockée sur l'événement. */
  category: PlanningEventCategory
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

/** Catégorie de planning personnalisée d'un utilisateur (gestionnaire de catégories). */
export interface PlanningCategoryDto {
  id: string
  name: string
  color: string
  /** Emoji, jamais vide (📁 par défaut). */
  icon: string
  sortOrder: number
  isDefault: boolean
  eventsCount: number
}

/** Temps planifié/effectué par catégorie (minutes). */
export interface PlanningCategoryStat {
  categoryId: string
  name: string
  color: string
  icon: string
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
