import { xpForLevel, type PublicUser } from '@one-mission/shared'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsUpDown, LogOut, Settings, Star, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, ProgressBar } from '@/components/ui'
import { useLogout } from '@/features/auth/useLogout'
import { PlanBadge } from '@/features/subscription/PlanBadge'
import { usePlan } from '@/features/subscription/useSubscription'
import { cn } from '@/lib/cn'

interface SidebarProfileCardProps {
  user: PublicUser
  /** Appelé après un choix dans le menu (ferme le tiroir mobile). */
  onNavigate?: () => void
}

/**
 * Carte premium du joueur ancrée en bas de la sidebar : identité, niveau, XP
 * et offre. Cliquable : ouvre un menu contextuel (Profil, Paramètres,
 * Déconnexion) juste au-dessus, fermé par sélection, clic extérieur ou Échap.
 */
export function SidebarProfileCard({ user, onNavigate }: SidebarProfileCardProps) {
  const { plan } = usePlan()
  const navigate = useNavigate()
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const xpForNext = xpForLevel(user.level)
  const percent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0

  // Fermeture par clic extérieur ou Échap.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function go(to: string) {
    setMenuOpen(false)
    onNavigate?.()
    navigate(to)
  }

  async function handleLogout() {
    setMenuOpen(false)
    onNavigate?.()
    await logout()
  }

  return (
    <div ref={rootRef} className="relative border-t border-line p-3">
      {/* Menu contextuel, ancré juste au-dessus de la carte */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="menu"
            aria-label="Menu du profil"
            className="absolute inset-x-3 bottom-full z-50 mb-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl"
          >
            <MenuItem icon={User} label="Profil" onClick={() => go('/app/profile')} />
            <MenuItem icon={Settings} label="Paramètres" onClick={() => go('/app/settings')} />
            <div className="my-1 h-px bg-line" />
            <MenuItem icon={LogOut} label="Déconnexion" danger onClick={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={cn(
          'w-full cursor-pointer rounded-2xl border p-3 text-left transition-colors duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          menuOpen
            ? 'border-accent/40 bg-surface-2'
            : 'border-line bg-surface-2/60 hover:border-accent/30 hover:bg-surface-2',
        )}
      >
        <div className="flex items-start gap-2.5">
          <Avatar src={user.avatarUrl} name={user.username} size={40} className="ring-2 ring-surface" />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] leading-tight font-bold text-ink">{user.username}</p>
          </div>
          <span
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              menuOpen ? 'text-accent' : 'text-faint',
            )}
          >
            <ChevronsUpDown size={15} />
          </span>
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
      </motion.button>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof User
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-surface-2',
      )}
    >
      <Icon size={16} className={danger ? undefined : 'text-muted'} />
      {label}
    </button>
  )
}
