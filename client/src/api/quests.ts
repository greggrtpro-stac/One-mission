import type {
  MainQuestDto,
  QuestActionResult,
  QuestCategoryDto,
  QuestDto,
  XpResult,
} from '@one-mission/shared'
import { http } from './http'

// ── Quêtes ───────────────────────────────────────────────────

export interface QuestPayload {
  title: string
  description?: string | null
  categoryId: string
  priority: string
  difficulty: string
  dueDate: string
  dueTime?: string | null
  /** Créneau optionnel : la quête est aussi ajoutée au Planning (ISO datetimes). */
  planning?: { startAt: string; endAt: string } | null
}

export const questsApi = {
  list: () => http.get<{ quests: QuestDto[] }>('/api/quests'),
  create: (payload: QuestPayload) => http.post<{ quest: QuestDto }>('/api/quests', payload),
  update: (id: string, payload: Partial<QuestPayload> & { progress?: number; status?: string }) =>
    http.patch<QuestActionResult>(`/api/quests/${id}`, payload),
  complete: (id: string) => http.post<QuestActionResult>(`/api/quests/${id}/complete`),
  uncomplete: (id: string) => http.post<QuestActionResult>(`/api/quests/${id}/uncomplete`),
  remove: (id: string) => http.delete<{ xp: XpResult | null }>(`/api/quests/${id}`),
}

// ── Catégories de quêtes ─────────────────────────────────────

export interface QuestCategoryPayload {
  name: string
  color?: string
  icon?: string | null
}

export type QuestCategoryDelete =
  | { strategy: 'reassign'; targetCategoryId: string }
  | { strategy: 'deleteQuests' }

export const questCategoriesApi = {
  list: () => http.get<{ categories: QuestCategoryDto[] }>('/api/quests/categories'),
  create: (payload: QuestCategoryPayload) =>
    http.post<{ category: QuestCategoryDto }>('/api/quests/categories', payload),
  update: (id: string, payload: Partial<QuestCategoryPayload>) =>
    http.patch<{ category: QuestCategoryDto }>(`/api/quests/categories/${id}`, payload),
  reorder: (ids: string[]) => http.put<null>('/api/quests/categories/reorder', { ids }),
  /** Supprimer des quêtes terminées reprend leur XP : le résultat peut porter un delta. */
  remove: (id: string, payload: QuestCategoryDelete) =>
    http.delete<{ xp: XpResult | null }>(`/api/quests/categories/${id}`, payload),
}

// ── Quête principale ─────────────────────────────────────────

export interface MainQuestPayload {
  title: string
  description?: string | null
  targetDate?: string | null
  progress?: number
  milestones?: { id: string; title: string; done: boolean }[]
}

export const mainQuestApi = {
  get: () => http.get<{ mainQuest: MainQuestDto | null }>('/api/main-quest'),
  upsert: (payload: MainQuestPayload) =>
    http.put<{ mainQuest: MainQuestDto }>('/api/main-quest', payload),
  patch: (payload: Partial<MainQuestPayload>) =>
    http.patch<{ mainQuest: MainQuestDto }>('/api/main-quest', payload),
  remove: () => http.delete<null>('/api/main-quest'),
}
