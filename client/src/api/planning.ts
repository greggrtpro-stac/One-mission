import type {
  PlanningEventActionResult,
  PlanningEventDto,
  PlanningStats,
} from '@one-mission/shared'
import { http } from './http'

export interface PlanningEventPayload {
  title: string
  description?: string | null
  notes?: string | null
  color: string
  category: string
  priority: string
  /** ISO datetime. */
  startAt: string
  /** ISO datetime, après startAt. */
  endAt: string
  reminderMinutes?: number | null
}

export type PlanningEventUpdate = Partial<PlanningEventPayload> & {
  status?: 'PLANNED' | 'CANCELLED'
}

const range = (from: string, to: string) =>
  `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`

export const planningApi = {
  list: (from: string, to: string) =>
    http.get<{ events: PlanningEventDto[] }>(`/api/planning?${range(from, to)}`),
  stats: (from: string, to: string) =>
    http.get<{ stats: PlanningStats }>(`/api/planning/stats?${range(from, to)}`),
  create: (payload: PlanningEventPayload) =>
    http.post<{ event: PlanningEventDto }>('/api/planning', payload),
  update: (id: string, payload: PlanningEventUpdate) =>
    http.patch<{ event: PlanningEventDto }>(`/api/planning/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/api/planning/${id}`),
  complete: (id: string) => http.post<PlanningEventActionResult>(`/api/planning/${id}/complete`),
  uncomplete: (id: string) =>
    http.post<PlanningEventActionResult>(`/api/planning/${id}/uncomplete`),
  convertToQuest: (
    id: string,
    payload: { difficulty: string; dueDate: string; dueTime?: string | null },
  ) => http.post<{ event: PlanningEventDto }>(`/api/planning/${id}/convert-to-quest`, payload),
}
