import { X } from 'lucide-react'
import { useState } from 'react'
import { BETA } from '@/config/beta'

const DISMISS_KEY = 'om-beta-banner'

/**
 * Bandeau bêta discret, affiché en haut de tout le site tant que
 * BETA.enabled est vrai (config/beta.ts). Refermable ; le choix est mémorisé
 * dans le navigateur (localStorage, listé sur la page Gestion des cookies).
 */
export function BetaBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (!BETA.enabled || dismissed) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      role="status"
      className="relative z-40 flex items-center justify-center gap-3 border-b border-accent/25 bg-accent-soft px-10 py-1.5 text-center"
    >
      <p className="text-xs leading-relaxed text-accent">
        <span className="font-semibold">Bêta</span> · {BETA.message}
      </p>
      <button
        onClick={dismiss}
        aria-label="Masquer le bandeau bêta"
        className="absolute right-2 rounded-md p-1 text-accent/70 transition-colors hover:bg-accent/10 hover:text-accent"
      >
        <X size={14} />
      </button>
    </div>
  )
}
