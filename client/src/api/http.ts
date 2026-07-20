import type { AuthResponse } from '@one-mission/shared'
import { useAuthStore } from '@/stores/auth'

/** Client HTTP : JSON, cookies inclus, access token + refresh automatique sur 401. */

export class ApiRequestError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.details = details
  }
}

/**
 * Message affichable à l'utilisateur : celui de l'API (`error`, ou `message`
 * pour les réponses qui utilisent cette clé), sinon un repli français selon
 * le code HTTP — jamais de « Erreur 500 » brut ni de détail technique.
 */
function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const { error, message } = body as { error?: unknown; message?: unknown }
    if (typeof error === 'string' && error) return error
    if (typeof message === 'string' && message) return message
  }
  if (status === 429) return 'Trop de tentatives. Veuillez réessayer plus tard.'
  if (status >= 500) return 'Une erreur est survenue. Veuillez réessayer plus tard.'
  return 'Une erreur est survenue.'
}

let refreshPromise: Promise<string | null> | null = null

/** Une seule requête de refresh à la fois, partagée entre les appels concurrents. */
export function refreshSession(): Promise<string | null> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      if (!res.ok) return null
      const data = (await res.json()) as AuthResponse
      useAuthStore.getState().setSession(data.user, data.accessToken)
      return data.accessToken
    } catch {
      return null
    } finally {
      // Libère le verrou après résolution (micro-délai pour les awaiters en cours).
      setTimeout(() => {
        refreshPromise = null
      }, 0)
    }
  })()
  return refreshPromise
}

async function request<T>(path: string, init: RequestInit, allowRetry: boolean): Promise<T> {
  const { accessToken } = useAuthStore.getState()

  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
  })

  // Access token expiré : on tente un refresh silencieux puis on rejoue l'appel.
  // Les routes d'auth sont exclues (boucles), sauf /sessions qui est un
  // endpoint authentifié classique placé là pour voir le cookie refresh.
  const canRetry = !path.startsWith('/api/auth/') || path.startsWith('/api/auth/sessions')
  if (res.status === 401 && allowRetry && canRetry) {
    const newToken = await refreshSession()
    if (newToken) return request<T>(path, init, false)
    useAuthStore.getState().clearSession()
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiRequestError(res.status, extractErrorMessage(body, res.status), body)
  }

  return body as T
}

export function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, true)
}

export const http = {
  get: <T>(path: string) => api<T>(path),
  post: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    api<T>(path, {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
}
