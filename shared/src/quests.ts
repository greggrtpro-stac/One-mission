/** Constantes métier des quêtes, partagées client/serveur. */

/**
 * Couleur présélectionnée à la création d'une catégorie de quêtes : le violet
 * de One Mission (l'utilisateur reste libre d'en choisir une autre). À ne pas
 * confondre avec la palette de choix rapide AUTO_CATEGORY_COLORS, partagée
 * avec le Planning.
 */
export const DEFAULT_QUEST_CATEGORY_COLOR = '#8B5CF6'

/** Catégorie de quête telle qu'embarquée dans une quête (couleur/icône incluses). */
export interface QuestCategoryRef {
  id: string
  name: string
  /** Couleur hex "#RRGGBB". */
  color: string
  /** Emoji, jamais vide (📁 par défaut). */
  icon: string
}

/** Catégorie de quêtes personnalisée d'un utilisateur (gestionnaire de catégories). */
export interface QuestCategoryDto {
  id: string
  name: string
  color: string
  /** Emoji, jamais vide (📁 par défaut). */
  icon: string
  sortOrder: number
  isDefault: boolean
  questsCount: number
}

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
}

export const QUEST_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const
export type QuestStatus = (typeof QUEST_STATUSES)[number]

export const STATUS_LABELS: Record<QuestStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
}
