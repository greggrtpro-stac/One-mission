import type {
  CommunicationPrefs,
  FriendPrefs,
  Language,
  NotificationPrefs,
  PublicUser,
  SessionsResponse,
} from '@one-mission/shared'
import { useAuthStore } from '@/stores/auth'
import { api, http } from './http'

export interface ProfilePayload {
  username?: string
  email?: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  avatarUrl?: string | null
  theme?: 'dark' | 'light'
  language?: Language
  notifications?: NotificationPrefs
  showOnLeaderboard?: boolean
  friendPrefs?: FriendPrefs
  newsletterOptIn?: boolean
  communicationPrefs?: CommunicationPrefs
}

export async function updateProfile(payload: ProfilePayload): Promise<PublicUser> {
  const data = await http.patch<{ user: PublicUser }>('/api/users/me', payload)
  useAuthStore.getState().setUser(data.user)
  return data.user
}

/** Désinscription en un clic des communications marketing (sécurité toujours conservée). */
export async function unsubscribeMarketing(): Promise<PublicUser> {
  const data = await http.post<{ user: PublicUser }>('/api/users/me/unsubscribe-marketing')
  useAuthStore.getState().setUser(data.user)
  return data.user
}

export function changePassword(payload: { currentPassword?: string; newPassword: string }) {
  return http.patch<{ message: string }>('/api/users/me/password', payload)
}

/** Export RGPD : télécharge toutes les données du compte en JSON. */
export async function downloadMyData(): Promise<void> {
  const data = await http.get<unknown>('/api/users/me/export')
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'one-mission-mes-donnees.json'
  link.click()
  URL.revokeObjectURL(url)
}

/** Sessions actives du compte (écran « Appareils connectés »). */
export async function fetchSessions() {
  const data = await http.get<SessionsResponse>('/api/auth/sessions')
  return data.sessions
}

/** Révoque la session d'un seul appareil (les autres restent connectés). */
export async function revokeSession(sessionId: string): Promise<void> {
  await http.delete(`/api/auth/sessions/${sessionId}`)
}

/** Révoque toutes les sessions (tous les appareils), y compris celle-ci. */
export async function logoutAllDevices(): Promise<void> {
  try {
    await http.post('/api/users/me/logout-all')
  } finally {
    useAuthStore.getState().clearSession()
  }
}

/** Suppression définitive du compte et de toutes ses données. */
export async function deleteAccount(password?: string): Promise<void> {
  await api('/api/users/me', {
    method: 'DELETE',
    body: JSON.stringify(password ? { password } : {}),
  })
  useAuthStore.getState().clearSession()
}
