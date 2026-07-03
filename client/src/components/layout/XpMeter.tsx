import { xpForLevel } from '@one-mission/shared'
import { ProgressBar } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'

/** Niveau + progression d'XP affichés en permanence dans la barre du haut. */
export function XpMeter() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null

  const xpForNext = xpForLevel(user.level)
  const percent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-7 items-center rounded-full bg-accent-soft px-2.5 text-xs font-bold text-accent">
        Nv {user.level}
      </span>
      <div className="hidden w-28 sm:block">
        <ProgressBar value={percent} size="sm" />
      </div>
      <span className="hidden text-xs text-muted md:block">
        {user.currentXp}/{xpForNext} XP
      </span>
    </div>
  )
}
