import type { RoutineDay, RoutineOverviewResponse } from '@one-mission/shared'
import { http } from './http'

interface RoutineTaskEcho {
  id: string
  title: string
  sortOrder: number
}

export const routinesApi = {
  overview: () => http.get<RoutineOverviewResponse>('/api/routines'),
  createTask: (sectionId: string, title: string) =>
    http.post<RoutineTaskEcho>(`/api/routines/sections/${sectionId}/tasks`, { title }),
  updateTask: (taskId: string, title: string) =>
    http.patch<RoutineTaskEcho>(`/api/routines/tasks/${taskId}`, { title }),
  deleteTask: (taskId: string) => http.delete<null>(`/api/routines/tasks/${taskId}`),
  reorderTasks: (sectionId: string, ids: string[]) =>
    http.put<null>(`/api/routines/sections/${sectionId}/tasks/reorder`, { ids }),
  check: (taskId: string, day: RoutineDay) =>
    http.post<null>(`/api/routines/tasks/${taskId}/check`, { day }),
  uncheck: (taskId: string, day: RoutineDay) =>
    http.post<null>(`/api/routines/tasks/${taskId}/uncheck`, { day }),
  /** Réinitialise uniquement la semaine en cours — l'historique reste intact (série). */
  reset: () => http.post<RoutineOverviewResponse>('/api/routines/reset'),
}
