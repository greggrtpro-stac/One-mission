import {
  featuresOf,
  PLANS,
  type BillingCycle,
  type BillingDetailsPayload,
  type PlanTier,
} from '@one-mission/shared'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Check, Lock, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { subscriptionApi } from '@/api/subscription'
import { Button, Card, Input, Select } from '@/components/ui'
import { PrivacyNotice } from '@/features/auth/PrivacyNotice'
import { usePageTitle } from '@/lib/usePageTitle'
import { useAuthStore } from '@/stores/auth'

const COUNTRIES: { code: string; label: string }[] = [
  { code: 'FR', label: 'France' },
  { code: 'BE', label: 'Belgique' },
  { code: 'CH', label: 'Suisse' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'MC', label: 'Monaco' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Allemagne' },
  { code: 'ES', label: 'Espagne' },
  { code: 'IT', label: 'Italie' },
  { code: 'PT', label: 'Portugal' },
  { code: 'NL', label: 'Pays-Bas' },
  { code: 'GB', label: 'Royaume-Uni' },
  { code: 'US', label: 'États-Unis' },
]

function formatPrice(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/**
 * Page de paiement : récapitulatif de l'offre + coordonnées de facturation,
 * puis redirection vers Stripe Checkout. AUCUNE activation ici : le serveur
 * n'active l'abonnement qu'à la confirmation officielle de Stripe (webhook).
 */
export function CheckoutPage() {
  usePageTitle('Paiement')
  const user = useAuthStore((s) => s.user)
  const [params] = useSearchParams()

  const planParam = params.get('plan') as PlanTier | null
  const cycle: BillingCycle = params.get('cycle') === 'YEARLY' ? 'YEARLY' : 'MONTHLY'

  const [billing, setBilling] = useState<BillingDetailsPayload>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    address: '',
    postalCode: '',
    city: '',
    country: 'FR',
  })

  const checkout = useMutation({
    mutationFn: () =>
      subscriptionApi.createCheckout({ plan: planParam as 'PRO' | 'MAX', billingCycle: cycle, billing }),
    onSuccess: (url) => {
      // Vers la page de paiement sécurisée Stripe (carte bancaire).
      window.location.href = url
    },
  })

  if (planParam !== 'PRO' && planParam !== 'MAX') {
    return <Navigate to="/app/level-up" replace />
  }
  const plan = PLANS[planParam]
  const total = cycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly

  function set<K extends keyof BillingDetailsPayload>(key: K, value: string) {
    setBilling((b) => ({ ...b, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    checkout.mutate()
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/app/level-up"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Retour aux offres
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Finaliser mon abonnement</h1>
      <p className="mt-1 text-sm text-muted">
        Paiement sécurisé par Stripe — rien n'est prélevé avant l'écran de carte bancaire.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Coordonnées de facturation ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="font-semibold">Coordonnées de facturation</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Prénom"
                required
                maxLength={50}
                autoComplete="given-name"
                value={billing.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
              <Input
                label="Nom"
                required
                maxLength={50}
                autoComplete="family-name"
                value={billing.lastName}
                onChange={(e) => set('lastName', e.target.value)}
              />
            </div>
            <Input
              label="Adresse e-mail"
              type="email"
              value={user?.email ?? ''}
              disabled
              hint="L'e-mail de ton compte — les reçus Stripe y seront envoyés."
            />
            <Input
              label="Adresse de facturation"
              required
              maxLength={200}
              autoComplete="street-address"
              placeholder="12 rue des Quêtes"
              value={billing.address}
              onChange={(e) => set('address', e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Code postal"
                required
                maxLength={12}
                autoComplete="postal-code"
                value={billing.postalCode}
                onChange={(e) => set('postalCode', e.target.value)}
              />
              <Input
                label="Ville"
                required
                maxLength={80}
                autoComplete="address-level2"
                value={billing.city}
                onChange={(e) => set('city', e.target.value)}
              />
              <Select
                label="Pays"
                value={billing.country}
                onChange={(e) => set('country', e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {checkout.error && (
            <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {checkout.error instanceof Error
                ? checkout.error.message
                : 'Impossible de démarrer le paiement'}
            </p>
          )}

          <Button type="submit" size="lg" loading={checkout.isPending} className="glow-accent">
            <Lock size={16} /> Continuer vers le paiement sécurisé
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-faint">
            <ShieldCheck size={13} /> Carte bancaire traitée par Stripe — One Mission ne voit
            jamais ton numéro de carte.
          </p>
          <PrivacyNotice text="Ces coordonnées servent uniquement à établir ta facturation via Stripe, notre prestataire de paiement." />
        </form>

        {/* ── Récapitulatif de la commande ── */}
        <Card className="h-fit p-6">
          <h2 className="font-semibold">Récapitulatif</h2>
          <div className="mt-4 rounded-xl bg-accent-soft p-4">
            <p className="text-lg font-bold">Offre {plan.name}</p>
            <p className="mt-0.5 text-sm text-muted">{plan.tagline}</p>
          </div>
          <ul className="mt-4 space-y-2">
            {featuresOf(plan.tier).map((f) => (
              <li key={f.key} className="flex items-start gap-2 text-sm">
                <Check size={15} className="mt-0.5 shrink-0 text-success" />
                {f.label}
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Prix mensuel</span>
              <span>{formatPrice(plan.priceMonthly)} €</span>
            </div>
            <div className="mt-1 flex justify-between text-muted">
              <span>Cycle de facturation</span>
              <span>{cycle === 'MONTHLY' ? 'Mensuel' : 'Annuel (≈ 2 mois offerts)'}</span>
            </div>
            <div className="mt-3 flex justify-between text-base font-bold">
              <span>Total {cycle === 'MONTHLY' ? 'par mois' : 'par an'}</span>
              <span>{formatPrice(total)} €</span>
            </div>
            <p className="mt-2 text-xs text-faint">
              Renouvelé automatiquement chaque {cycle === 'MONTHLY' ? 'mois' : 'année'}. Résiliable
              à tout moment depuis « Mon abonnement » — sans frais, effectif en fin de période.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
