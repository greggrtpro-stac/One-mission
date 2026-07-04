import type { JournalEntryDto, XpResult } from '@one-mission/shared'
import { http } from './http'

export const journalApi = {
  list: () => http.get<{ entries: JournalEntryDto[]; aiAvailable: boolean }>('/api/journal'),
  get: (date: string) => http.get<{ entry: JournalEntryDto | null }>(`/api/journal/${date}`),
  save: (date: string, content: string) =>
    http.put<{ entry: JournalEntryDto; xp: XpResult | null }>(`/api/journal/${date}`, { content }),
  remove: (date: string) => http.delete<null>(`/api/journal/${date}`),
  analyze: (date: string) => http.post<{ entry: JournalEntryDto }>(`/api/journal/${date}/analyze`),
}
