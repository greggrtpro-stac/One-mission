import type { BillingCycle, CheckoutPayload, SubscriptionDto } from '@one-mission/shared'
import { http } from './http'

export const subscriptionApi = {
  /** Abonnement du joueur connecté (créé en Starter au premier appel). */
  me: () =>
    http
      .get<{ subscription: SubscriptionDto }>('/api/subscriptions/me')
      .then((d) => d.subscription),

  /** Retour à l'offre gratuite — seul changement direct autorisé par le serveur. */
  downgradeToStarter: (billingCycle: BillingCycle = 'MONTHLY') =>
    http
      .post<{ subscription: SubscriptionDto }>('/api/subscriptions/me/plan', {
        plan: 'STARTER',
        billingCycle,
      })
      .then((d) => d.subscription),

  /** Démarre un paiement Stripe Checkout : renvoie l'URL de la page Stripe. */
  createCheckout: (payload: CheckoutPayload) =>
    http.post<{ url: string }>('/api/subscriptions/checkout', payload).then((d) => d.url),

  /** Résilie l'abonnement payant (avantages conservés jusqu'à la fin de période). */
  cancel: () =>
    http
      .post<{ subscription: SubscriptionDto }>('/api/subscriptions/cancel')
      .then((d) => d.subscription),
}
