import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

const LINKS = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/confidentialite', label: 'Politique de confidentialité' },
  { to: '/cookies', label: 'Gestion des cookies' },
]

/** Liens vers les pages juridiques — affichés dans les pieds de page de tout le site. */
export function LegalFooterLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Informations légales"
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint', className)}
    >
      {LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="transition-colors hover:text-ink hover:underline">
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
