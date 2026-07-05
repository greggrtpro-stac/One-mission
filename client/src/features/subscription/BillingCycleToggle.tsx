import type { BillingCycle } from '@one-mission/shared'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'

interface BillingCycleToggleProps {
  value: BillingCycle
  onChange: (cycle: BillingCycle) => void
}

/** Interrupteur mensuel / annuel (remise annuelle affichée en badge). */
export function BillingCycleToggle({ value, onChange }: BillingCycleToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 p-1">
      {(['MONTHLY', 'YEARLY'] as const).map((cycle) => (
        <button
          key={cycle}
          onClick={() => onChange(cycle)}
          className={cn(
            'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            value === cycle ? 'text-on-accent' : 'text-muted hover:text-ink',
          )}
        >
          {value === cycle && (
            <motion.span
              layoutId="billing-cycle-pill"
              className="absolute inset-0 rounded-full bg-accent"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {cycle === 'MONTHLY' ? 'Mensuel' : 'Annuel'}
            {cycle === 'YEARLY' && (
              <Badge
                variant={value === cycle ? 'neutral' : 'accent'}
                className={cn('py-0', value === cycle && 'bg-white/20 text-on-accent')}
              >
                -17%
              </Badge>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
