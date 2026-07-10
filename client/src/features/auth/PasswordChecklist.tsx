import {
  PASSWORD_CRITERIA_LABELS,
  PASSWORD_STRENGTH_LABELS,
  passwordCriteria,
  passwordStrength,
  type PasswordCriteria,
  type PasswordStrength,
} from '@one-mission/shared'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Couleur et remplissage (sur 4) de la jauge pour chaque niveau. */
const STRENGTH_META: Record<PasswordStrength, { color: string; filled: number }> = {
  faible: { color: 'var(--danger)', filled: 1 },
  moyen: { color: 'var(--warning)', filled: 2 },
  fort: { color: 'var(--accent)', filled: 3 },
  tres_fort: { color: 'var(--success)', filled: 4 },
}

/**
 * Critères de mot de passe validés en temps réel + jauge de robustesse.
 * Mêmes règles que le serveur (module partagé) : ce qui est vert ici passera.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const criteria = passwordCriteria(password)
  const strength = passwordStrength(password)
  const meta = STRENGTH_META[strength]

  return (
    <div className="rounded-xl border border-line bg-surface-2/50 px-3.5 py-3">
      <ul className="grid gap-1 sm:grid-cols-2">
        {(Object.keys(PASSWORD_CRITERIA_LABELS) as (keyof PasswordCriteria)[]).map((key) => {
          const ok = criteria[key]
          return (
            <li
              key={key}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                ok ? 'text-success' : 'text-muted',
              )}
            >
              {ok ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0 text-faint" />}
              {PASSWORD_CRITERIA_LABELS[key]}
            </li>
          )
        })}
      </ul>

      {/* Jauge de robustesse : 4 segments, colorés selon le niveau atteint. */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex flex-1 gap-1" role="meter" aria-label="Robustesse du mot de passe">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background: password && i < meta.filled ? meta.color : 'var(--line)',
              }}
            />
          ))}
        </div>
        {password && (
          <span className="text-xs font-medium tabular-nums" style={{ color: meta.color }}>
            {PASSWORD_STRENGTH_LABELS[strength]}
          </span>
        )}
      </div>
    </div>
  )
}
