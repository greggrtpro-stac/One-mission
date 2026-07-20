import type { LeaderboardResponse, ProfileStats, PublicProfileResponse } from '@one-mission/shared'
import { http } from './http'

export const leaderboardApi = {
  get: (scope: 'global' | 'friends' = 'global') =>
    http.get<LeaderboardResponse>(scope === 'friends' ? '/api/leaderboard?scope=friends' : '/api/leaderboard'),
  /** Profil public d'un joueur — 404 si inexistant ou masqué du classement. */
  profile: (userId: string) =>
    http.get<PublicProfileResponse>(`/api/leaderboard/${encodeURIComponent(userId)}`),
}

export const statsApi = {
  profile: () => http.get<ProfileStats>('/api/stats/profile'),
}
