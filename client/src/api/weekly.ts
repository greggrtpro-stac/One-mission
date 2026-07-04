import type {
  DashboardSummary,
  WeeklyQuestActionResult,
  WeeklyQuestDto,
} from '@one-mission/shared'
import { http } from './http'

export interface WeeklyPayload {
  title: string
  description?: string | null
  difficulty: string
}

export const weeklyApi = {
  list: () => http.get<{ weeklyQuests: WeeklyQuestDto[] }>('/api/weekly-quests'),
  create: (payload: WeeklyPayload) =>
    http.post<{ weeklyQuest: WeeklyQuestDto }>('/api/weekly-quests', payload),
  update: (id: string, payload: Partial<WeeklyPayload>) =>
    http.patch<{ weeklyQuest: WeeklyQuestDto }>(`/api/weekly-quests/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/api/weekly-quests/${id}`),
  reorder: (ids: string[]) => http.put<null>('/api/weekly-quests/reorder', { ids }),
  complete: (id: string) =>
    http.post<WeeklyQuestActionResult>(`/api/weekly-quests/${id}/complete`),
  uncomplete: (id: string) =>
    http.post<WeeklyQuestActionResult>(`/api/weekly-quests/${id}/uncomplete`),
}

export const dashboardApi = {
  summary: () => http.get<DashboardSummary>('/api/dashboard'),
}
