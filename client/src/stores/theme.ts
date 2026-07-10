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
  /**
   * Applique et persiste localement. Pour un choix VOLONTAIRE de
   * l'utilisateur, passer par `chooseTheme` (lib/themePreference.ts) qui
   * enregistre aussi la préférence sur le compte — seul moyen d'éviter que
   * la valeur en base réécrase le choix local à la session suivante.
   */
  setTheme: (theme: ThemeName) => void
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
    }),
    {
      name: 'om-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)

// Synchronisation entre onglets : quand un autre onglet change le thème
// (écriture dans localStorage), celui-ci se réhydrate et réapplique —
// l'événement `storage` ne se déclenche que dans les AUTRES onglets, aucun
// risque de boucle.
window.addEventListener('storage', (event) => {
  if (event.key === 'om-theme') void useThemeStore.persist.rehydrate()
})
