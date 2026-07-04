import type { Language, NotificationPrefs, PublicUser } from '@one-mission/shared'
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
}

export async function updateProfile(payload: ProfilePayload): Promise<PublicUser> {
  const data = await http.patch<{ user: PublicUser }>('/api/users/me', payload)
  useAuthStore.getState().setUser(data.user)
  return data.user
}

export function changePassword(payload: { currentPassword?: string; newPassword: string }) {
  return http.patch<{ message: string }>('/api/users/me/password', payload)
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
