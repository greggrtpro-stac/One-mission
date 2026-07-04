import type { XpResult } from '@one-mission/shared'
import { create } from 'zustand'
import { useAuthStore } from './auth'

interface XpToast {
  id: number
  amount: number
}

interface XpFxState {
  toasts: XpToast[]
  /** Nouveau niveau à célébrer (null = pas de célébration en cours). */
  levelUp: number | null
  pushToast: (amount: number) => void
  dismissToast: (id: number) => void
  clearLevelUp: () => void
  celebrate: (level: number) => void
}

let nextId = 1

/** File d'effets visuels de gamification (toasts d'XP, montée de niveau). */
export const useXpFxStore = create<XpFxState>()((set) => ({
  toasts: [],
  levelUp: null,
  pushToast: (amount) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, amount }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  celebrate: (level) => set({ levelUp: level }),
  clearLevelUp: () => set({ levelUp: null }),
}))

/**
 * Applique un résultat d'XP renvoyé par l'API :
 * met à jour le joueur en mémoire et déclenche les animations.
 */
export function applyXpResult(xp: XpResult | null | undefined) {
  if (!xp) return

  const { user, setUser } = useAuthStore.getState()
  if (user) {
    setUser({
      ...user,
      totalXp: xp.totalXp,
      level: xp.level,
      currentXp: xp.currentXp,
      currentStreak: xp.currentStreak,
      longestStreak: xp.longestStreak,
    })
  }

  const fx = useXpFxStore.getState()
  if (xp.xpGained !== 0) fx.pushToast(xp.xpGained)
  if (xp.leveledUp) fx.celebrate(xp.level)
}
