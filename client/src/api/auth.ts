import type {
  AuthResponse,
  RegisterResponse,
  TurnstileSiteKeyResponse,
  VerifyEmailResponse,
} from '@one-mission/shared'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/auth'
import { http, refreshSession } from './http'

/**
 * Les clés de requêtes ne sont pas liées à un utilisateur : au changement
 * d'identité (connexion à un autre compte, déconnexion), le cache est purgé
 * pour ne jamais montrer les données du compte précédent.
 */
function clearCacheIfSwitchingFrom(previousUserId: string | undefined, nextUserId: string) {
  if (previousUserId && previousUserId !== nextUserId) queryClient.clear()
}

export interface RegisterPayload {
  email: string
  password: string
  username: string
  firstName?: string
  lastName?: string
  turnstileToken: string
}

/** Crée le compte — aucune session : il reste inactif tant que l'e-mail n'est pas confirmé. */
export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return http.post<RegisterResponse>('/api/auth/register', payload)
}

export async function login(
  email: string,
  password: string,
  turnstileToken: string,
): Promise<AuthResponse> {
  const previousUserId = useAuthStore.getState().user?.id
  const data = await http.post<AuthResponse>('/api/auth/login', { email, password, turnstileToken })
  clearCacheIfSwitchingFrom(previousUserId, data.user.id)
  useAuthStore.getState().setSession(data.user, data.accessToken)
  return data
}

export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const previousUserId = useAuthStore.getState().user?.id
  const data = await http.post<AuthResponse>('/api/auth/google', { credential })
  clearCacheIfSwitchingFrom(previousUserId, data.user.id)
  useAuthStore.getState().setSession(data.user, data.accessToken)
  return data
}

export async function logout(): Promise<void> {
  try {
    await http.post('/api/auth/logout')
  } finally {
    useAuthStore.getState().clearSession()
    // Rien du compte quitté ne doit survivre pour le prochain utilisateur du navigateur.
    queryClient.clear()
  }
}

export function forgotPassword(email: string, turnstileToken: string) {
  return http.post<{ message: string }>('/api/auth/forgot-password', { email, turnstileToken })
}

export function resetPassword(token: string, password: string) {
  return http.post<{ message: string }>('/api/auth/reset-password', { token, password })
}

export function verifyEmail(token: string, uid?: string) {
  return http.post<VerifyEmailResponse>('/api/auth/verify-email', { token, uid })
}

/** Ne révèle jamais si le compte existe : toujours le même message générique en retour. */
export function resendVerification(email: string, turnstileToken: string) {
  return http.post<{ message: string }>('/api/auth/resend-verification', { email, turnstileToken })
}

export function fetchGoogleClientId() {
  return http.get<{ clientId: string | null }>('/api/auth/google/client-id')
}

export function fetchTurnstileSiteKey() {
  return http.get<TurnstileSiteKeyResponse>('/api/auth/turnstile/site-key')
}

/** Restaure la session au chargement de l'app (cookie refresh httpOnly). */
export async function bootstrapSession(): Promise<void> {
  const token = await refreshSession()
  if (!token) useAuthStore.getState().setGuest()
}
