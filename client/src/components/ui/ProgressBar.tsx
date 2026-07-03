import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface ProgressBarProps {
  /** Progression entre 0 et 100. */
  value: number
  className?: string
  /** Hauteur de la piste. */
  size?: 'sm' | 'md' | 'lg'
}

const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }

/** Barre de progression orange animée (XP, quêtes, objectifs). */
export function ProgressBar({ value, size = 'md', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-full bg-surface-2', heights[size], className)}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%)',
          boxShadow: '0 0 12px -2px var(--accent-glow)',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </div>
  )
}
