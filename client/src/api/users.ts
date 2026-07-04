import type { PublicUser } from '@one-mission/shared'
import { useAuthStore } from '@/stores/auth'
import { http } from './http'

export interface ProfilePayload {
  username?: string
  email?: string
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  theme?: 'dark' | 'light'
}

export async function updateProfile(payload: ProfilePayload): Promise<PublicUser> {
  const data = await http.patch<{ user: PublicUser }>('/api/users/me', payload)
  useAuthStore.getState().setUser(data.user)
  return data.user
}

export function changePassword(payload: { currentPassword?: string; newPassword: string }) {
  return http.patch<{ message: string }>('/api/users/me/password', payload)
}
