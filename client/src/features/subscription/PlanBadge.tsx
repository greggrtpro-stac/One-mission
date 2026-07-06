import { PLANS, type PlanTier } from '@one-mission/shared'
import { Crown, Rocket, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'

const ICONS: Record<PlanTier, typeof Sparkles> = {
  STARTER: Sparkles,
  PRO: Rocket,
  MAX: Crown,
}

const STYLES: Record<PlanTier, string> = {
  STARTER: 'bg-surface-2 text-muted',
  PRO: 'bg-accent-soft text-accent',
  MAX: 'border border-amber-300/40 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white shadow-[0_2px_14px_-3px_rgba(245,158,11,0.65)]',
}

interface PlanBadgeProps {
  plan: PlanTier
  className?: string
}

/** Petit badge « Starter / Pro / Max », réutilisé dans la nav, le profil et Level Up. */
export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const Icon = ICONS[plan]
  return (
    <Badge className={cn(STYLES[plan], className)}>
      <Icon size={12} />
      {PLANS[plan].name}
    </Badge>
  )
}
