import { useNavigate } from 'react-router-dom'
import { logout } from '@/api/auth'

/**
 * Logique de déconnexion partagée (menu du profil, Paramètres) :
 * révoque la session côté serveur, vide le store puis renvoie à la connexion.
 */
export function useLogout() {
  const navigate = useNavigate()
  return async () => {
    await logout()
    navigate('/login')
  }
}
