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

/**
 * Identité pour laquelle la préférence de thème du compte a déjà été adoptée.
 * setSession est appelé à CHAQUE rotation silencieuse du token (~15 min) :
 * sans ce garde, la valeur en base écrasait un choix local plus récent et le
 * thème « changeait tout seul » en pleine session. L'adoption ne doit avoir
 * lieu qu'à l'établissement d'une session (démarrage, connexion, changement
 * de compte) — le garde est réinitialisé à la déconnexion pour que la
 * prochaine connexion adopte à nouveau la préférence du compte.
 */
let themeAdoptedForUserId: string | null = null

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  status: 'loading',
  setSession: (user, accessToken) => {
    // Le thème choisi par le joueur suit son compte — adopté une seule fois
    // par session, jamais lors des rotations de token du même utilisateur.
    if (
      themeAdoptedForUserId !== user.id &&
      (user.theme === 'dark' || user.theme === 'light')
    ) {
      useThemeStore.getState().setTheme(user.theme as ThemeName)
    }
    themeAdoptedForUserId = user.id
    set({ user, accessToken, status: 'authed' })
  },
  setUser: (user) => set({ user }),
  setGuest: () => {
    themeAdoptedForUserId = null
    set({ user: null, accessToken: null, status: 'guest' })
  },
  clearSession: () => {
    themeAdoptedForUserId = null
    set({ user: null, accessToken: null, status: 'guest' })
  },
}))
