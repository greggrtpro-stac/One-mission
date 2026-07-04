import { AnimatePresence, motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useXpFxStore } from '@/stores/xpFx'

/** Pile de toasts « +50 XP » en bas de l'écran. */
export function XpToasts() {
  const toasts = useXpFxStore((s) => s.toasts)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[60] flex flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -32, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className={
              toast.amount > 0
                ? 'flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-bold text-on-accent shadow-[0_8px_32px_-8px_var(--accent-glow)]'
                : 'flex items-center gap-2 rounded-full bg-surface-3 px-5 py-2.5 font-bold text-muted shadow-xl'
            }
          >
            <Zap size={18} fill="currentColor" />
            {toast.amount > 0 ? `+${toast.amount} XP` : `${toast.amount} XP`}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
