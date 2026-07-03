import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeName = 'dark' | 'light'

/** Registre des thèmes : en ajouter un = ajouter un fichier CSS + une entrée ici. */
export const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'dark', label: 'Mode sombre' },
  { id: 'light', label: 'Mode clair' },
]

interface ThemeState {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  toggle: () => void
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'om-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
