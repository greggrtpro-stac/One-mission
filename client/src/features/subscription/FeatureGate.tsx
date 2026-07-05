import { getFeature, type FeatureKey } from '@one-mission/shared'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '@/components/ui'
import { PlanBadge } from './PlanBadge'
import { usePlan } from './useSubscription'

interface FeatureGateProps {
  feature: FeatureKey
  children: ReactNode
}

/**
 * Verrouille une section entière de l'UI selon l'abonnement.
 * Le serveur reste l'autorité (403 UPGRADE_REQUIRED sur les routes
 * protégées) : ce composant évite juste d'afficher un contenu inaccessible.
 */
export function FeatureGate({ feature, children }: FeatureGateProps) {
  const { has, isLoading } = usePlan()
  if (isLoading) return null
  if (has(feature)) return <>{children}</>

  const def = getFeature(feature)

  return (
    <Card className="flex flex-col items-center gap-4 border-dashed p-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Lock size={24} />
      </span>
      <div>
        <h3 className="text-lg font-semibold">{def.label}</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted">{def.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Nécessite</span>
        <PlanBadge plan={def.minPlan} />
      </div>
      <Link to="/app/level-up">
        <Button className="glow-accent">Débloquer sur Level Up</Button>
      </Link>
    </Card>
  )
}
