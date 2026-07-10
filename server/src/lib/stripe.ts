import Stripe from 'stripe'
import { env } from '../config/env.js'
import type { BillingCycle, PlanTier } from '@one-mission/shared'

/**
 * Client Stripe — null tant que STRIPE_SECRET_KEY n'est pas configurée.
 * Dans ce cas, les routes de paiement renvoient une erreur claire et AUCUN
 * abonnement payant ne peut être activé (ni gratuitement, ni autrement).
 */
export const stripe: Stripe | null = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null

export const stripeEnabled = stripe !== null

/** Identifiant du Price Stripe pour une offre payante et un cycle donnés. */
export function priceIdFor(plan: Exclude<PlanTier, 'STARTER'>, cycle: BillingCycle): string {
  const table = {
    PRO: { MONTHLY: env.STRIPE_PRICE_PRO_MONTHLY, YEARLY: env.STRIPE_PRICE_PRO_YEARLY },
    MAX: { MONTHLY: env.STRIPE_PRICE_MAX_MONTHLY, YEARLY: env.STRIPE_PRICE_MAX_YEARLY },
  } as const
  return table[plan][cycle]
}
