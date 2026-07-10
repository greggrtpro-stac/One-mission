import { updateProfile } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemeName } from '@/stores/theme'

/**
 * Point d'entrée UNIQUE du choix volontaire de thème (topbar et Paramètres).
 * Applique immédiatement, persiste localement (om-theme) et, si un compte est
 * connecté, enregistre la préférence côté serveur — c'est ce dernier point qui
 * manquait au bouton de la topbar : la base gardait l'ancienne valeur et la
 * réappliquait à la rotation de token suivante (« le thème change tout seul »).
 */
export function chooseTheme(theme: ThemeName): void {
  useThemeStore.getState().setTheme(theme)

  const { user } = useAuthStore.getState()
  if (user && user.theme !== theme) {
    // updateProfile synchronise aussi le user du store auth (user.theme à jour).
    // En cas d'échec réseau, le choix local reste appliqué pour cette session ;
    // la préférence du compte reprendra la main au prochain chargement.
    updateProfile({ theme }).catch(() => {})
  }
}
