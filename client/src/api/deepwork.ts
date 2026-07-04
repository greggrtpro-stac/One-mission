import type {
  AddictionDto,
  DeepWorkSessionDto,
  DeepWorkSettings,
  DeepWorkStats,
} from '@one-mission/shared'
import { http } from './http'

export const deepworkApi = {
  stats: () => http.get<DeepWorkStats>('/api/deepwork/stats'),
  sessions: () => http.get<{ sessions: DeepWorkSessionDto[] }>('/api/deepwork/sessions'),
  recordSession: (payload: {
    startedAt: string
    duration: number
    kind: string
    completed: boolean
  }) => http.post<{ session: DeepWorkSessionDto }>('/api/deepwork/sessions', payload),
  saveSettings: (settings: DeepWorkSettings) =>
    http.put<{ settings: DeepWorkSettings }>('/api/deepwork/settings', settings),
}

export const addictionsApi = {
  list: () => http.get<{ addictions: AddictionDto[] }>('/api/addictions'),
  create: (payload: { name: string; icon?: string | null; startDate?: string }) =>
    http.post<{ addiction: AddictionDto }>('/api/addictions', payload),
  update: (id: string, payload: { name?: string; icon?: string | null; startDate?: string }) =>
    http.patch<{ addiction: AddictionDto }>(`/api/addictions/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/api/addictions/${id}`),
  relapse: (id: string, note?: string | null) =>
    http.post<{ addiction: AddictionDto }>(`/api/addictions/${id}/relapse`, { note: note ?? null }),
}
