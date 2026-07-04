import type { CoachMessageDto, CoachThread } from '@one-mission/shared'
import { http } from './http'

export const coachApi = {
  thread: (addictionId: string) => http.get<CoachThread>(`/api/addictions/${addictionId}/coach`),
  send: (addictionId: string, content: string) =>
    http.post<{ messages: CoachMessageDto[] }>(`/api/addictions/${addictionId}/coach`, { content }),
}
