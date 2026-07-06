import type { MainQuestDto, QuestActionResult, QuestDto, XpResult } from '@one-mission/shared'
import { http } from './http'

// ── Quêtes ───────────────────────────────────────────────────

export interface QuestPayload {
  title: string
  description?: string | null
  category: string
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
