import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LegalFooterLinks } from '@/components/LegalFooterLinks'
import { Logo, LogoMark } from '@/components/ui'
import { usePageTitle } from '@/lib/usePageTitle'

interface AuthLayoutProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}

/** Écran d'authentification : formulaire à gauche, panneau de marque à droite. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  usePageTitle(title)
  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* ── Formulaire ── */}
      <div className="flex w-full flex-col px-6 py-8 lg:w-[46%] lg:px-16">
        <Link to="/" className="w-fit">
          <Logo size={26} />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10"
        >
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>

        <LegalFooterLinks className="justify-center" />
      </div>

      {/* ── Panneau de marque ── */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden border-l border-line lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 blur-[100px]"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, var(--accent) 0%, transparent 45%), radial-gradient(circle at 75% 70%, var(--accent-hover) 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex max-w-md flex-col items-center px-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          >
            <LogoMark size={120} />
          </motion.div>
          <p className="mt-10 text-2xl font-semibold tracking-tight">
            « Chaque jour est une quête.
            <br />
            <span className="text-accent">Chaque quête te rapproche.</span> »
          </p>
          <p className="mt-4 text-sm text-muted">
            Rejoins les joueurs qui transforment leur discipline en progression.
          </p>
        </div>
      </div>
    </div>
  )
}
