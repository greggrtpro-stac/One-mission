import { PLANS, type SubscriptionStatus } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, Rocket, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { subscriptionApi } from '@/api/subscription'
import { Badge, Button, Card, Modal, Spinner } from '@/components/ui'
import { usePageTitle } from '@/lib/usePageTitle'
import { PlanBadge } from './PlanBadge'
import { useSubscription } from './useSubscription'

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const STATUS_META: Record<
  SubscriptionStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  ACTIVE: { label: 'Actif', variant: 'success' },
  TRIALING: { label: "Période d'essai", variant: 'success' },
  PAST_DUE: { label: 'Paiement en retard', variant: 'warning' },
  CANCELED: { label: 'Annulé', variant: 'neutral' },
  EXPIRED: { label: 'Expiré', variant: 'danger' },
}

/** Gestion de l'abonnement : offre, prix, dates, statut et résiliation. */
export function SubscriptionPage() {
  usePageTitle('Mon abonnement')
  const { data: sub, isLoading, refetch } = useSubscription()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const checkoutResult = params.get('checkout') // success | cancelled | null

  // Retour de Stripe : l'activation arrive par webhook (asynchrone) — on
  // rafraîchit l'abonnement quelques secondes jusqu'à voir le changement.
  useEffect(() => {
    if (checkoutResult !== 'success') return
    const interval = setInterval(() => void refetch(), 2000)
    const stop = setTimeout(() => clearInterval(interval), 20000)
    return () => {
      clearInterval(interval)
      clearTimeout(stop)
    }
  }, [checkoutResult, refetch])

  const cancel = useMutation({
    mutationFn: subscriptionApi.cancel,
    onSuccess: () => {
      setConfirmCancel(false)
      void queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  if (isLoading || !sub) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="text-accent" />
      </div>
    )
  }

  const plan = PLANS[sub.plan]
  const isPaid = sub.plan !== 'STARTER'
  const status = STATUS_META[sub.status]
  const price = sub.billingCycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Mon abonnement</h1>
      <p className="mt-1 text-sm text-muted">
        Ta formule, tes échéances et la gestion de ton renouvellement.
      </p>

      {/* Retour de paiement Stripe */}
      {checkoutResult === 'success' && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-success-soft p-4 text-sm text-success">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Paiement confirmé — merci !</p>
            <p className="mt-0.5">
              {isPaid
                ? 'Ton abonnement est actif.'
                : 'Ton abonnement s’active (quelques secondes)…'}
            </p>
          </div>
        </div>
      )}
      {checkoutResult === 'cancelled' && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-sm text-warning">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Paiement annulé</p>
            <p className="mt-0.5">
              Aucun montant n'a été prélevé et ton offre n'a pas changé. Tu peux réessayer quand tu
              veux.
            </p>
          </div>
        </div>
      )}

      {/* Carte abonnement */}
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Rocket size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <PlanBadge plan={sub.plan} />
                <Badge variant={status.variant}>
                  {sub.cancelAtPeriodEnd && sub.status === 'ACTIVE' ? 'Annulé — actif jusqu’à échéance' : status.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted">{plan.tagline}</p>
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {isPaid ? `${price.toFixed(2).replace('.', ',')} €` : 'Gratuit'}
            {isPaid && (
              <span className="text-sm font-normal text-muted">
                /{sub.billingCycle === 'MONTHLY' ? 'mois' : 'an'}
              </span>
            )}
          </p>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-faint">Début de l'abonnement</dt>
            <dd className="mt-0.5 font-medium">{formatDateFr(sub.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-faint">
              {sub.cancelAtPeriodEnd ? 'Fin des avantages' : 'Prochaine facturation'}
            </dt>
            <dd className="mt-0.5 font-medium">
              {sub.currentPeriodEnd ? formatDateFr(sub.currentPeriodEnd) : '—'}
            </dd>
          </div>
        </dl>

        {sub.cancelAtPeriodEnd && sub.currentPeriodEnd && (
          <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
            Résiliation enregistrée : tu conserves tous tes avantages jusqu'au{' '}
            <span className="font-medium text-ink">{formatDateFr(sub.currentPeriodEnd)}</span>,
            puis ton compte repassera sur l'offre gratuite. Aucun prélèvement supplémentaire.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <Link to="/app/level-up" className="text-sm text-accent hover:underline">
            Voir toutes les offres
          </Link>
          {isPaid && !sub.cancelAtPeriodEnd && (
            <Button variant="danger-soft" onClick={() => setConfirmCancel(true)}>
              Résilier mon abonnement
            </Button>
          )}
        </div>
        {cancel.error && (
          <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {cancel.error instanceof Error ? cancel.error.message : 'Résiliation impossible'}
          </p>
        )}
      </Card>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-faint">
        <CreditCard size={13} /> Paiements et données bancaires gérés par Stripe.
      </p>

      {/* Confirmation de résiliation */}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Résilier ton abonnement ?"
      >
        <p className="text-sm text-muted">
          Ton abonnement <span className="font-medium text-ink">{plan.name}</span> ne sera plus
          renouvelé. Tu conserves tous tes avantages jusqu'à la fin de la période déjà payée
          {sub.currentPeriodEnd ? ` (${formatDateFr(sub.currentPeriodEnd)})` : ''}, puis ton compte
          repassera sur l'offre gratuite. Aucun prélèvement supplémentaire n'aura lieu.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            Garder mon abonnement
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
            Résilier
          </Button>
        </div>
      </Modal>
    </div>
  )
}
