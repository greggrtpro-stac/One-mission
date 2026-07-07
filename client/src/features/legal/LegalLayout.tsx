import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LegalFooterLinks } from '@/components/LegalFooterLinks'
import { Logo } from '@/components/ui'
import { LEGAL } from '@/config/legal'
import { usePageTitle } from '@/lib/usePageTitle'

interface LegalLayoutProps {
  title: string
  children: ReactNode
}

/** Gabarit commun des pages juridiques : lisible, sobre, accessible sans compte. */
export function LegalLayout({ title, children }: LegalLayoutProps) {
  usePageTitle(title)
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/">
          <Logo size={26} />
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} /> Retour au site
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-6 pb-16">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-faint">Dernière mise à jour : {LEGAL.lastUpdated}</p>
        <div className="mt-8 flex flex-col gap-8">{children}</div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-3 px-6 py-6 sm:flex-row sm:items-center">
          <p className="text-xs text-faint">
            © {new Date().getFullYear()} {LEGAL.siteName}
          </p>
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  )
}

/** Section titrée d'une page juridique. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

/** Valeur inline — affichée en orange si elle reste à compléter. */
export function LegalValue({ value }: { value: string }) {
  return value.startsWith('[À COMPLÉTER') ? (
    <span className="text-warning">{value}</span>
  ) : (
    <span>{value}</span>
  )
}

/** Ligne « libellé : valeur » — signale visuellement les champs à compléter. */
export function LegalField({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null
  return (
    <p>
      <span className="font-medium text-ink">{label} : </span>
      <LegalValue value={value} />
    </p>
  )
}
