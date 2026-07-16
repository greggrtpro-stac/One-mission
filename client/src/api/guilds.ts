import type {
  CreateGuildPayload,
  GuildInvitationsResponse,
  GuildLeaderboardResponse,
  GuildMessageDto,
  GuildMessagesResponse,
  GuildResponse,
  GuildSearchResponse,
  GuildStatsResponse,
  JoinGuildResult,
  MyGuildResponse,
  UpdateGuildPayload,
} from '@one-mission/shared'
import { http } from './http'

/** Joueur invitable trouvé par la recherche du chef/officier. */
export interface InvitablePlayer {
  userId: string
  username: string
  avatarUrl: string | null
  level: number
  alreadyInvited: boolean
}

export const guildsApi = {
  // Classement, recherche, fiche
  leaderboard: () => http.get<GuildLeaderboardResponse>('/api/guilds'),
  search: (q: string) =>
    http.get<GuildSearchResponse>(`/api/guilds/search?q=${encodeURIComponent(q)}`),
  get: (guildId: string) => http.get<GuildResponse>(`/api/guilds/${guildId}`),
  stats: (guildId: string) => http.get<GuildStatsResponse>(`/api/guilds/${guildId}/stats`),

  // Ma guilde
  mine: () => http.get<MyGuildResponse>('/api/guilds/me'),
  create: (payload: CreateGuildPayload) => http.post<GuildResponse>('/api/guilds', payload),
  update: (guildId: string, payload: UpdateGuildPayload) =>
    http.patch<GuildResponse>(`/api/guilds/${guildId}`, payload),
  remove: (guildId: string) => http.delete<void>(`/api/guilds/${guildId}`),
  leave: () => http.post<void>('/api/guilds/me/leave'),

  // Adhésions
  join: (guildId: string, message?: string) =>
    http.post<JoinGuildResult>(`/api/guilds/${guildId}/join`, message ? { message } : {}),
  cancelRequest: (requestId: string) => http.delete<void>(`/api/guilds/requests/${requestId}`),
  acceptRequest: (requestId: string) =>
    http.post<void>(`/api/guilds/requests/${requestId}/accept`),
  declineRequest: (requestId: string) =>
    http.post<void>(`/api/guilds/requests/${requestId}/decline`),

  // Invitations
  myInvitations: () => http.get<GuildInvitationsResponse>('/api/guilds/invitations'),
  acceptInvitation: (id: string) => http.post<void>(`/api/guilds/invitations/${id}/accept`),
  declineInvitation: (id: string) => http.post<void>(`/api/guilds/invitations/${id}/decline`),
  searchInvitable: (guildId: string, q: string) =>
    http.get<{ results: InvitablePlayer[] }>(
      `/api/guilds/${guildId}/invitable?q=${encodeURIComponent(q)}`,
    ),
  invite: (guildId: string, userId: string) =>
    http.post<{ status: string }>(`/api/guilds/${guildId}/invitations`, { userId }),

  // Membres & rôles
  promote: (guildId: string, userId: string) =>
    http.post<void>(`/api/guilds/${guildId}/members/${userId}/promote`),
  demote: (guildId: string, userId: string) =>
    http.post<void>(`/api/guilds/${guildId}/members/${userId}/demote`),
  kick: (guildId: string, userId: string) =>
    http.post<void>(`/api/guilds/${guildId}/members/${userId}/kick`),
  transfer: (guildId: string, userId: string) =>
    http.post<void>(`/api/guilds/${guildId}/transfer`, { userId }),

  // Chat
  messages: (guildId: string, before?: string) =>
    http.get<GuildMessagesResponse>(
      `/api/guilds/${guildId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  postMessage: (guildId: string, content: string, replyToId?: string) =>
    http.post<{ message: GuildMessageDto }>(`/api/guilds/${guildId}/messages`, {
      content,
      ...(replyToId ? { replyToId } : {}),
    }),
  deleteMessage: (guildId: string, messageId: string) =>
    http.delete<void>(`/api/guilds/${guildId}/messages/${messageId}`),
  markRead: (guildId: string) => http.post<void>(`/api/guilds/${guildId}/messages/read`),
}
