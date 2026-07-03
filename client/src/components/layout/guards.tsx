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

/** Routes d'auth : un joueur déjà connecté est renvoyé vers l'app. */
export function GuestOnly() {
  const status = useAuthStore((s) => s.status)
  if (status === 'loading') return <SplashScreen />
  if (status === 'authed') return <Navigate to="/app" replace />
  return <Outlet />
}
