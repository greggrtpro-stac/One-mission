import type {
  FriendRequestsResponse,
  FriendSearchResponse,
  FriendsListResponse,
  NotificationsResponse,
} from '@one-mission/shared'
import { http } from './http'

export const friendsApi = {
  list: () => http.get<FriendsListResponse>('/api/friends'),
  search: (q: string) => http.get<FriendSearchResponse>(`/api/friends/search?q=${encodeURIComponent(q)}`),
  requests: () => http.get<FriendRequestsResponse>('/api/friends/requests'),
  sendRequest: (userId: string) =>
    http.post<{ status: 'pending' | 'accepted' }>('/api/friends/requests', { userId }),
  acceptRequest: (id: string) => http.post<void>(`/api/friends/requests/${id}/accept`),
  declineRequest: (id: string) => http.post<void>(`/api/friends/requests/${id}/decline`),
  cancelRequest: (id: string) => http.delete<void>(`/api/friends/requests/${id}`),
  removeFriend: (userId: string) => http.delete<void>(`/api/friends/${userId}`),
}

/** Futur centre de notifications — l'API existe déjà, l'UI viendra plus tard. */
export const notificationsApi = {
  list: () => http.get<NotificationsResponse>('/api/notifications'),
  readAll: () => http.post<void>('/api/notifications/read-all'),
}
