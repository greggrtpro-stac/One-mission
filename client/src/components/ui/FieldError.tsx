import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

/** Message d'erreur affiché sous un champ : icône + apparition animée. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="animate-error-in flex items-start gap-1.5 text-xs text-danger">
      <CircleAlert size={14} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
