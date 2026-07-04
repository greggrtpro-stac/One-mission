import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { deepworkApi } from '@/api/deepwork'
import { useDeepWorkStore } from '@/stores/deepwork'
import { applyXpResult } from '@/stores/xpFx'

/**
 * Monté dans l'AppShell : fait vivre le timer DeepWork sur toutes les pages
 * et enregistre les sessions terminées côté serveur.
 */
export function DeepWorkTicker() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useDeepWorkStore.getState()
      if (state.status !== 'running' || !state.endsAt) return
      if (state.endsAt > Date.now()) return

      const record = state.completePhase()
      if (record) {
        void deepworkApi.recordSession(record).then((result) => {
          applyXpResult(result.xp)
          void queryClient.invalidateQueries({ queryKey: ['deepwork'] })
          void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        })
      }
    }, 500)
    return () => clearInterval(interval)
  }, [queryClient])

  return null
}
