import type { BillingCycle, PlanTier } from '@one-mission/shared'

/**
 * Abstraction du fournisseur de paiement.
 *
 * Tant que les paiements ne sont pas actifs, `FreeBillingProvider` accorde
 * les changements d'offre immédiatement et sans facturation. Le jour où
 * Stripe est branché, on écrit un `StripeBillingProvider` qui implémente la
 * même interface (checkout, webhooks, portail client, codes promo, essais)
 * et on remplace l'export `billingProvider` — le reste du code ne bouge pas.
 */

export interface PlanChangeResult {
  /** Statut résultant du changement (TRIALING si période d'essai). */
  status: 'ACTIVE' | 'TRIALING'
  /** Prochaine date de renouvellement calculée par le fournisseur. */
  currentPeriodEnd: Date
  /** Fin de la période d'essai, le cas échéant. */
  trialEndsAt: Date | null
  /** Remise appliquée par un code promo, le cas échéant. */
  discountPercent: number | null
}

export interface BillingProvider {
  readonly name: string
  /**
   * Prépare/valide le passage d'un utilisateur à une offre.
   * Avec Stripe : création de session checkout ou mise à jour de l'abonnement.
   */
  changePlan(params: {
    userId: string
    plan: PlanTier
    billingCycle: BillingCycle
    promoCode?: string | null
  }): Promise<PlanChangeResult>
  /** Calcule la fin de période suivante (renouvellement). */
  nextPeriodEnd(from: Date, cycle: BillingCycle): Date
}

function addCycle(from: Date, cycle: BillingCycle): Date {
  const next = new Date(from)
  if (cycle === 'YEARLY') next.setFullYear(next.getFullYear() + 1)
  else next.setMonth(next.getMonth() + 1)
  return next
}

/** Mode gratuit : tout changement d'offre est accordé instantanément. */
class FreeBillingProvider implements BillingProvider {
  readonly name = 'free'

  changePlan(params: { billingCycle: BillingCycle }): Promise<PlanChangeResult> {
    const now = new Date()
    return Promise.resolve({
      status: 'ACTIVE',
      currentPeriodEnd: addCycle(now, params.billingCycle),
      trialEndsAt: null,
      discountPercent: null,
    })
  }

  nextPeriodEnd(from: Date, cycle: BillingCycle): Date {
    return addCycle(from, cycle)
  }
}

export const billingProvider: BillingProvider = new FreeBillingProvider()
