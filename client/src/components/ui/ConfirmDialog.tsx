import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from './Button'

type ConfirmTone = 'danger' | 'warning' | 'accent'

const TONE_CLASSES: Record<ConfirmTone, string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  accent: 'bg-accent-soft text-accent',
}

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  /** Icône affichée dans un badge coloré à côté du titre. */
  icon: LucideIcon
  /** Couleur du badge d'icône — la couleur du bouton principal reste toujours l'accent. */
  tone?: ConfirmTone
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Affiche un spinner et désactive les boutons pendant la mutation en cours. */
  loading?: boolean
}

/**
 * Modale de confirmation unique de One Mission — remplace tout `window.confirm`.
 * Toute action destructive ou sensible (suppression, réinitialisation,
 * déconnexion…) doit passer par ce composant plutôt que par une boîte de
 * dialogue native ou une modale ad hoc : même trame visuelle partout, un seul
 * endroit à faire évoluer.
 *
 * Accessibilité : Échap ferme, le focus est posé sur le bouton principal à
 * l'ouverture (Entrée le valide immédiatement) et Tab reste piégé dans la boîte
 * tant qu'elle est ouverte.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  icon: Icon,
  tone = 'danger',
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function focusable(): HTMLElement[] {
      if (!dialogRef.current) return []
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      )
    }

    // Focus initial sur le bouton principal — Entrée le valide immédiatement.
    const raf = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-confirm-primary]')?.focus()
    })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const items = focusable()
        if (items.length === 0) return
        const first = items[0]!
        const last = items[items.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-full',
                  TONE_CLASSES[tone],
                )}
              >
                <Icon size={20} />
              </span>
              <h2 id="confirm-dialog-title" className="text-base font-semibold">
                {title}
              </h2>
            </div>

            <div className="mt-3 space-y-1.5 text-sm text-muted">{description}</div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button data-confirm-primary onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
