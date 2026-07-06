import { xpForLevel, type PublicUser } from '@one-mission/shared'
import { motion } from 'framer-motion'
import { LogOut, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/api/auth'
import { Avatar, ProgressBar } from '@/components/ui'
import { PlanBadge } from '@/features/subscription/PlanBadge'
import { usePlan } from '@/features/subscription/useSubscription'

/** Carte premium du joueur ancrée en bas de la sidebar : identité, niveau, XP et offre. */
export function SidebarProfileCard({ user }: { user: PublicUser }) {
  const { plan } = usePlan()
  const navigate = useNavigate()

  const xpForNext = xpForLevel(user.level)
  const percent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="border-t border-line p-3">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="rounded-2xl border border-line bg-surface-2/60 p-3 transition-colors duration-200 hover:border-accent/30 hover:bg-surface-2"
      >
        <div className="flex items-start gap-2.5">
          <Avatar src={user.avatarUrl} name={user.username} size={40} className="ring-2 ring-surface" />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] font-bold leading-tight text-ink">{user.username}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-accent">
              <Star size={13} className="fill-current" />
              Niveau {user.level}
            </span>
            <span className="shrink-0 text-[10.5px] text-muted tabular-nums">
              {user.currentXp}/{xpForNext} XP
            </span>
          </div>
          <ProgressBar value={percent} size="sm" className="mt-1.5" />
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold text-ink tabular-nums">
            {user.totalXp.toLocaleString('fr-FR')} XP au total
          </span>
          <PlanBadge plan={plan} className="shrink-0" />
        </div>
      </motion.div>
    </div>
  )
}
