import { xpForLevel } from '@one-mission/shared'
import { motion } from 'framer-motion'
import { Card, ProgressBar } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'

/** Version provisoire — le tableau de bord complet arrive en Phase 4. */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null

  const xpForNext = xpForLevel(user.level)
  const percent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0
  const greeting = user.firstName ?? user.username

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">
          Salut, <span className="text-accent">{greeting}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-muted">Prêt à avancer sur ta mission aujourd'hui ?</p>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Niveau</p>
          <p className="mt-1 text-3xl font-bold text-accent">{user.level}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">XP totale</p>
          <p className="mt-1 text-3xl font-bold">{user.totalXp}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Série</p>
          <p className="mt-1 text-3xl font-bold">{user.currentStreak} j</p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium">Progression vers le niveau {user.level + 1}</p>
          <p className="text-muted">
            {user.currentXp}/{xpForNext} XP
          </p>
        </div>
        <ProgressBar value={percent} className="mt-3" />
      </Card>
    </div>
  )
}
