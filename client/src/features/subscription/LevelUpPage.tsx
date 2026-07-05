import { featuresOf, lockedFeaturesOf, PLAN_LIST, PLANS, type BillingCycle } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Lock, Rocket } from 'lucide-react'
import { useState } from 'react'
import { subscriptionApi } from '@/api/subscription'
import { Badge, Card, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { BillingCycleToggle } from './BillingCycleToggle'
import { PlanBadge } from './PlanBadge'
import { PlanCard } from './PlanCard'
import { PlanComparisonTable } from './PlanComparisonTable'
import { useSubscription } from './useSubscription'

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Abonnement créé',
  UPGRADED: 'Passage à une offre supérieure',
  DOWNGRADED: 'Passage à une offre inférieure',
  CYCLE_CHANGED: 'Cycle de facturation modifié',
  RENEWED: 'Renouvellement',
  CANCELED: 'Abonnement annulé',
  REACTIVATED: 'Abonnement réactivé',
  EXPIRED: 'Abonnement expiré',
}

/** Page dédiée à l'abonnement du joueur : offre actuelle, avantages, upgrade. */
export function LevelUpPage() {
  const { data: sub, isLoading } = useSubscription()
  const queryClient = useQueryClient()
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY')

  const changePlan = useMutation({
    mutationFn: (plan: (typeof PLAN_LIST)[number]['tier']) =>
      subscriptionApi.changePlan(plan, cycle),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  })

  if (isLoading || !sub) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="text-accent" />
      </div>
    )
  }

  const plan = PLANS[sub.plan]
  const unlocked = featuresOf(sub.plan)
  const locked = lockedFeaturesOf(sub.plan)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Level Up</h1>
          <p className="mt-1 text-sm text-muted">
            Ton abonnement, tes avantages, et ce qu'il te reste à débloquer.
          </p>
        </div>
      </div>

      {/* Offre actuelle */}
      <Card className="mt-6 overflow-hidden">
        <div className="relative bg-gradient-to-br from-accent-soft to-transparent p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Rocket size={26} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    Offre actuelle
                  </p>
                  <PlanBadge plan={sub.plan} />
                </div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">{plan.name}</h2>
                <p className="mt-0.5 text-sm text-muted">{plan.tagline}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums">
                {sub.plan === 'STARTER' ? 'Gratuit' : `${plan.priceMonthly.toFixed(2)} €`}
                {sub.plan !== 'STARTER' && <span className="text-sm text-muted">/mois</span>}
              </p>
              {sub.currentPeriodEnd && (
                <p className="mt-1 text-xs text-faint">
                  Renouvellement le {formatDateFr(sub.currentPeriodEnd)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-7 md:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <Check size={15} /> Débloqué avec ton offre
            </h3>
            <ul className="mt-3 space-y-2">
              {unlocked.map((f) => (
                <li key={f.key} className="flex items-start gap-2.5 text-sm">
                  <Check size={15} className="mt-0.5 shrink-0 text-success" />
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted">
              <Lock size={15} /> Encore verrouillé
            </h3>
            {locked.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Tu as accès à tout. Merci de faire partie des joueurs Max 🎉
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {locked.map((f) => (
                  <li key={f.key} className="flex items-start gap-2.5 text-sm text-faint">
                    <Lock size={13} className="mt-0.5 shrink-0" />
                    <span>{f.label}</span>
                    <PlanBadge plan={f.minPlan} className="ml-auto shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Changement d'offre */}
      <div className="mt-10">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-bold tracking-tight">Changer d'offre</h2>
          <BillingCycleToggle value={cycle} onChange={setCycle} />
          {changePlan.error && (
            <p className="rounded-xl bg-danger-soft px-3.5 py-2 text-sm text-danger">
              {changePlan.error instanceof Error ? changePlan.error.message : 'Erreur'}
            </p>
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLAN_LIST.map((p, i) => (
            <PlanCard
              key={p.tier}
              plan={p}
              billingCycle={cycle}
              currentPlan={sub.plan}
              index={i}
              loading={changePlan.isPending}
              onSelect={(tier) => changePlan.mutate(tier)}
            />
          ))}
        </div>
      </div>

      {/* Comparatif complet */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Comparatif complet</h2>
        <PlanComparisonTable currentPlan={sub.plan} />
      </div>

      {/* Historique */}
      {sub.events.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Historique des changements</h2>
          <Card className="divide-y divide-line">
            {sub.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium">{EVENT_LABELS[e.type] ?? e.type}</p>
                  <p className="text-xs text-faint">{formatDateFr(e.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.fromPlan && (
                    <>
                      <Badge variant="neutral">{PLANS[e.fromPlan].name}</Badge>
                      <span className={cn('text-faint')}>→</span>
                    </>
                  )}
                  <PlanBadge plan={e.toPlan} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
