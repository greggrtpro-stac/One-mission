import type { LeaderboardResponse, ProfileStats } from '@one-mission/shared'
import { http } from './http'

export const leaderboardApi = {
  get: () => http.get<LeaderboardResponse>('/api/leaderboard'),
}

export const statsApi = {
  profile: () => http.get<ProfileStats>('/api/stats/profile'),
}
