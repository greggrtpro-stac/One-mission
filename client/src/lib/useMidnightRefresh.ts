import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/**
 * Invalide les requêtes données juste après minuit (heure locale), puis se
 * reprogramme pour la nuit suivante. Sert aux données « du jour » : au passage
 * de minuit, le serveur décoche les quêtes journalières terminées la veille et
 * l'app doit les recharger sans action de l'utilisateur.
 */
export function useMidnightRefresh(queryKeys: string[]): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    let timer: number

    const schedule = () => {
      const now = new Date()
      // 00:00:10 : dix secondes de marge après le reset côté serveur.
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 10)
      timer = window.setTimeout(() => {
        for (const key of queryKeys) {
          void queryClient.invalidateQueries({ queryKey: [key] })
        }
        schedule()
      }, next.getTime() - now.getTime())
    }

    schedule()
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKeys est une liste littérale stable
  }, [queryClient, ...queryKeys])
}
