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

/** Centre de notifications (cloche du header) — amis, guildes, et types futurs. */
export const notificationsApi = {
  list: () => http.get<NotificationsResponse>('/api/notifications'),
  markRead: (id: string) => http.post<void>(`/api/notifications/${id}/read`),
  readAll: () => http.post<void>('/api/notifications/read-all'),
}
