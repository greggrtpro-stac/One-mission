import {
  featuresOf,
  lockedFeaturesOf,
  PLAN_RANK,
  type BillingCycle,
  type PlanDef,
  type PlanTier,
} from '@one-mission/shared'
import { motion } from 'framer-motion'
import { Check, Sparkles, X } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { cn } from '@/lib/cn'

interface PlanCardProps {
  plan: PlanDef
  billingCycle: BillingCycle
  /** Offre actuelle du joueur, pour distinguer "Offre actuelle" / "Commencer". */
  currentPlan?: PlanTier | null
  onSelect: (tier: PlanTier) => void
  loading?: boolean
  index?: number
}

function formatPrice(value: number): string {
  return value === 0 ? '0' : value.toFixed(2).replace(/\.00$/, '').replace('.', ',')
}

/** Carte premium d'une offre — utilisée sur la landing et sur Level Up. */
export function PlanCard({
  plan,
  billingCycle,
  currentPlan,
  onSelect,
  loading,
  index = 0,
}: PlanCardProps) {
  const included = featuresOf(plan.tier)
  const locked = lockedFeaturesOf(plan.tier)
  const price = billingCycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly / 12
  const isCurrent = currentPlan === plan.tier
  const isDowngrade = currentPlan ? PLAN_RANK[plan.tier] < PLAN_RANK[currentPlan] : false

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: 0.08 * index, duration: 0.5, ease: 'easeOut' }}
      className="relative"
    >
      {plan.popular && (
        <div className="absolute inset-x-0 -top-3 z-10 flex justify-center">
          <Badge className="gap-1 border border-accent/40 bg-accent px-3 py-1 text-[13px] font-semibold text-on-accent shadow-[0_4px_20px_-6px_var(--accent-glow)]">
            <Sparkles size={13} /> Le plus populaire
          </Badge>
        </div>
      )}

      <Card
        hoverable
        className={cn(
          'flex h-full flex-col p-6 sm:p-7',
          plan.popular
            ? 'border-accent/50 shadow-[0_8px_40px_-12px_var(--accent-glow)] ring-1 ring-accent/20'
            : '',
        )}
      >
        <div>
          <h3 className="text-lg font-bold tracking-tight">{plan.name}</h3>
          <p className="mt-1.5 text-sm text-muted">{plan.tagline}</p>
        </div>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">{formatPrice(price)} €</span>
          <span className="text-sm text-muted">/mois</span>
        </div>
        {billingCycle === 'YEARLY' && plan.priceMonthly > 0 && (
          <p className="mt-1 text-xs text-faint">
            Facturé {formatPrice(plan.priceYearly)} € / an
          </p>
        )}

        <Button
          size="lg"
          variant={plan.popular ? 'primary' : 'secondary'}
          className={cn('mt-6 w-full', plan.popular && 'glow-accent')}
          disabled={isCurrent || loading}
          onClick={() => onSelect(plan.tier)}
        >
          {isCurrent ? 'Offre actuelle' : isDowngrade ? 'Rétrograder' : 'Commencer'}
        </Button>

        <div className="mt-7 space-y-2.5">
          {included.map((f) => (
            <div key={f.key} className="flex items-start gap-2.5 text-sm">
              <Check size={16} className="mt-0.5 shrink-0 text-success" />
              <span>{f.label}</span>
            </div>
          ))}
          {locked.map((f) => (
            <div key={f.key} className="flex items-start gap-2.5 text-sm text-faint">
              <X size={16} className="mt-0.5 shrink-0" />
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
