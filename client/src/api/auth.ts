import type { AuthResponse } from '@one-mission/shared'
import { useAuthStore } from '@/stores/auth'
import { http, refreshSession } from './http'

export interface RegisterPayload {
  email: string
  password: string
  username: string
  firstName?: string
  lastName?: string
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await http.post<AuthResponse>('/api/auth/register', payload)
  useAuthStore.getState().setSession(data.user, data.accessToken)
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await http.post<AuthResponse>('/api/auth/login', { email, password })
  useAuthStore.getState().setSession(data.user, data.accessToken)
  return data
}

export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const data = await http.post<AuthResponse>('/api/auth/google', { credential })
  useAuthStore.getState().setSession(data.user, data.accessToken)
  return data
}

export async function logout(): Promise<void> {
  try {
    await http.post('/api/auth/logout')
  } finally {
    useAuthStore.getState().clearSession()
  }
}

export function forgotPassword(email: string) {
  return http.post<{ message: string }>('/api/auth/forgot-password', { email })
}

export function resetPassword(token: string, password: string) {
  return http.post<{ message: string }>('/api/auth/reset-password', { token, password })
}

export function fetchGoogleClientId() {
  return http.get<{ clientId: string | null }>('/api/auth/google/client-id')
}

/** Restaure la session au chargement de l'app (cookie refresh httpOnly). */
export async function bootstrapSession(): Promise<void> {
  const token = await refreshSession()
  if (!token) useAuthStore.getState().setGuest()
}
