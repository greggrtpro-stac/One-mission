import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenText,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  Menu,
  Moon,
  Rocket,
  Settings,
  ShieldCheck,
  Sun,
  Swords,
  Timer,
  Trophy,
  User,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LevelUpOverlay } from '@/components/gamification/LevelUpOverlay'
import { XpToasts } from '@/components/gamification/XpToasts'
import { LegalFooterLinks } from '@/components/LegalFooterLinks'
import { Avatar, Logo } from '@/components/ui'
import { DeepWorkTicker } from '@/features/deepwork/DeepWorkTicker'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { SidebarProfileCard } from './SidebarProfileCard'
import { XpMeter } from './XpMeter'

const NAV = [
  { to: '/app', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/app/quests', label: 'Quêtes', icon: Swords },
  { to: '/app/weekly', label: 'Hebdomadaires', icon: CalendarCheck },
  { to: '/app/planning', label: 'Planning', icon: CalendarDays },
  { to: '/app/deepwork', label: 'DeepWork', icon: Timer },
  { to: '/app/addictions', label: 'Addictions', icon: ShieldCheck },
  { to: '/app/journal', label: 'Journal', icon: BookOpenText },
  { to: '/app/leaderboard', label: 'Classement', icon: Trophy },
  { to: '/app/level-up', label: 'Level Up', icon: Rocket },
]

const NAV_BOTTOM = [
  { to: '/app/profile', label: 'Profil', icon: User },
  { to: '/app/settings', label: 'Paramètres', icon: Settings },
]

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onClick,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent-soft text-accent'
            : 'text-muted hover:bg-surface-2 hover:text-ink',
        )
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4">
        <Link to="/app" onClick={onNavigate}>
          <Logo size={26} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNavigate} />
        ))}
        {/* Profil & Paramètres : visibles ici sur mobile uniquement — sur
            desktop (lg+) ils passent par le menu de la carte de profil. */}
        <div className="space-y-1 lg:hidden">
          <div className="my-3 h-px bg-line" />
          {NAV_BOTTOM.map((item) => (
            <NavItem key={item.to} {...item} onClick={onNavigate} />
          ))}
        </div>
      </nav>

      {user && <SidebarProfileCard user={user} onNavigate={onNavigate} />}
    </div>
  )
}

/** Coquille de l'application : sidebar fixe (desktop), tiroir (mobile), topbar. */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggle } = useThemeStore()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Tiroir mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-surface lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 rounded-lg p-1.5 text-muted hover:bg-surface-2"
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <XpMeter />

          <button
            onClick={toggle}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <Link to="/app/profile" title="Mon profil">
              <Avatar src={user.avatarUrl} name={user.username} size={32} />
            </Link>
          )}
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-line px-4 py-4 sm:px-6 lg:px-8">
          <LegalFooterLinks />
        </footer>
      </div>

      {/* Effets de gamification globaux + timer DeepWork actif sur toutes les pages */}
      <XpToasts />
      <LevelUpOverlay />
      <DeepWorkTicker />
    </div>
  )
}
