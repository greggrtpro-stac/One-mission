/** Constantes métier des quêtes, partagées client/serveur. */

export const QUEST_CATEGORIES = [
  'SPORT',
  'TRAVAIL',
  'ETUDES',
  'SANTE',
  'PERSO',
  'FINANCE',
  'AUTRE',
] as const
export type QuestCategory = (typeof QUEST_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<QuestCategory, string> = {
  SPORT: 'Sport',
  TRAVAIL: 'Travail',
  ETUDES: 'Études',
  SANTE: 'Santé',
  PERSO: 'Personnel',
  FINANCE: 'Finance',
  AUTRE: 'Autre',
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
