import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Portail vers <body> : un ancêtre avec transform/filter/backdrop-filter
  // (ex. le header en backdrop-blur) deviendrait sinon le bloc conteneur du
  // `position: fixed` et la modale s'afficherait dans sa bande au lieu du
  // viewport.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              'relative w-full max-w-lg rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl',
              'max-h-[92dvh] overflow-y-auto',
              className,
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
