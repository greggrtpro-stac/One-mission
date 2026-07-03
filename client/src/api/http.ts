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
  if (res.status === 401 && allowRetry && !path.startsWith('/api/auth/')) {
    const newToken = await refreshSession()
    if (newToken) return request<T>(path, init, false)
    useAuthStore.getState().clearSession()
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Erreur ${res.status}`
    throw new ApiRequestError(res.status, message, body)
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
  delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
}
