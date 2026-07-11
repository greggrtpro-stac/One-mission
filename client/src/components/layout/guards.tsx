import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { SplashScreen } from './SplashScreen'

/** Routes réservées aux joueurs connectés. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status)
  if (status === 'loading') return <SplashScreen />
  if (status === 'guest') return <Navigate to="/login" replace />
  return <Outlet />
}

/**
 * Pages d'authentification (connexion, inscription, mot de passe oublié…).
 * Toujours affichées, même quand une session est déjà active : se connecter
 * doit rester un choix explicite — un clic sur « Se connecter » ou
 * « Commencer » ouvre le formulaire, y compris pour changer de compte.
 * Une session active ne donne un accès direct qu'en visitant /app.
 * Seul le bootstrap en cours (rafraîchissement silencieux au chargement)
 * affiche l'écran d'attente, pour ne pas monter les widgets deux fois.
 */
export function AuthPages() {
  const status = useAuthStore((s) => s.status)
  if (status === 'loading') return <SplashScreen />
  return <Outlet />
}
