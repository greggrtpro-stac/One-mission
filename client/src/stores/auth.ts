import type { PublicUser } from '@one-mission/shared'
import { create } from 'zustand'
import { useThemeStore, type ThemeName } from './theme'

type AuthStatus = 'loading' | 'authed' | 'guest'

interface AuthState {
  user: PublicUser | null
  /** Access token gardé en mémoire uniquement (jamais en localStorage). */
  accessToken: string | null
  status: AuthStatus
  setSession: (user: PublicUser, accessToken: string) => void
  setUser: (user: PublicUser) => void
  setGuest: () => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  status: 'loading',
  setSession: (user, accessToken) => {
    // Le thème choisi par le joueur suit son compte.
    if (user.theme === 'dark' || user.theme === 'light') {
      useThemeStore.getState().setTheme(user.theme as ThemeName)
    }
    set({ user, accessToken, status: 'authed' })
  },
  setUser: (user) => set({ user }),
  setGuest: () => set({ user: null, accessToken: null, status: 'guest' }),
  clearSession: () => set({ user: null, accessToken: null, status: 'guest' }),
}))
