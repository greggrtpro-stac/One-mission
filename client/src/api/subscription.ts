import type { BillingCycle, PlanTier, SubscriptionDto } from '@one-mission/shared'
import { http } from './http'

export const subscriptionApi = {
  /** Abonnement du joueur connecté (créé en Starter au premier appel). */
  me: () =>
    http
      .get<{ subscription: SubscriptionDto }>('/api/subscriptions/me')
      .then((d) => d.subscription),

  /** Changement d'offre — gratuit tant que le paiement n'est pas branché. */
  changePlan: (plan: PlanTier, billingCycle: BillingCycle) =>
    http
      .post<{ subscription: SubscriptionDto }>('/api/subscriptions/me/plan', {
        plan,
        billingCycle,
      })
      .then((d) => d.subscription),
}
