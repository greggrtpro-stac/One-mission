import type { LeaderboardResponse, StatsOverview } from '@one-mission/shared'
import { http } from './http'

export const leaderboardApi = {
  get: () => http.get<LeaderboardResponse>('/api/leaderboard'),
}

export const statsApi = {
  overview: () => http.get<StatsOverview>('/api/stats/overview'),
}
