import type { BillingCycle, PlanTier } from '@one-mission/shared'
import { PLAN_RANK, PLAN_TIERS } from '@one-mission/shared'
import type Stripe from 'stripe'
import { env } from '../../config/env.js'
import { log } from '../../lib/log.js'
import { prisma } from '../../lib/prisma.js'
import { priceIdFor, stripe } from '../../lib/stripe.js'
import { ApiError } from '../../middleware/error.js'
import { getOrCreateSubscription } from './subscriptions.service.js'

/** Adresse de facturation saisie sur la page de paiement. */
export interface BillingDetails {
  firstName: string
  lastName: string
  address: string
  postalCode: string
  city: string
  country: string // code ISO 3166-1 alpha-2 (FR, BE, …)
}

function requireStripe(): Stripe {
  if (!stripe) {
    throw new ApiError(
      503,
      'Le paiement n’est pas encore configuré sur ce serveur (clés Stripe absentes)',
      'PAYMENTS_DISABLED',
    )
  }
  return stripe
}

/** Client Stripe de l'utilisateur — créé au premier paiement, puis réutilisé. */
async function getOrCreateCustomer(
  userId: string,
  billing: BillingDetails,
): Promise<string> {
  const s = requireStripe()
  const [user, sub] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getOrCreateSubscription(userId),
  ])

  const customerData = {
    email: user.email,
    name: `${billing.firstName} ${billing.lastName}`.trim(),
    address: {
      line1: billing.address,
      postal_code: billing.postalCode,
      city: billing.city,
      country: billing.country,
    },
    metadata: { userId },
  }

  if (sub.stripeCustomerId) {
    // Adresse de facturation mise à jour à chaque nouveau checkout.
    await s.customers.update(sub.stripeCustomerId, customerData)
    return sub.stripeCustomerId
  }

  const customer = await s.customers.create(customerData)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { stripeCustomerId: customer.id },
  })
  return customer.id
}

/**
 * Crée la session Stripe Checkout (abonnement mensuel/annuel à prélèvement
 * automatique). L'activation n'a JAMAIS lieu ici : elle attend le webhook.
 */
export async function createCheckoutSession(
  userId: string,
  plan: Exclude<PlanTier, 'STARTER'>,
  billingCycle: BillingCycle,
  billing: BillingDetails,
): Promise<{ url: string }> {
  const s = requireStripe()

  const price = priceIdFor(plan, billingCycle)
  if (!price) {
    throw new ApiError(
      503,
      `Le tarif Stripe de l’offre ${plan} (${billingCycle}) n’est pas configuré`,
      'PRICE_NOT_CONFIGURED',
    )
  }

  const current = await getOrCreateSubscription(userId)
  if (current.stripeSubscriptionId && current.status !== 'EXPIRED') {
    throw new ApiError(
      400,
      'Un abonnement payant est déjà en cours — gère-le depuis « Mon abonnement »',
      'SUBSCRIPTION_EXISTS',
    )
  }
  if (PLAN_RANK[current.plan] >= PLAN_RANK[plan] && current.status === 'ACTIVE') {
    throw new ApiError(400, 'Tu es déjà sur cette offre ou une offre supérieure', 'ALREADY_ON_PLAN')
  }

  const customerId = await getOrCreateCustomer(userId, billing)

  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    // Les métadonnées voyagent jusqu'aux webhooks : ce sont elles qui font foi.
    metadata: { userId, plan, billingCycle },
    subscription_data: { metadata: { userId, plan, billingCycle } },
    allow_promotion_codes: true,
    success_url: `${env.CLIENT_URL}/app/subscription?checkout=success`,
    cancel_url: `${env.CLIENT_URL}/app/subscription?checkout=cancelled`,
  })

  if (!session.url) throw new ApiError(502, 'Stripe n’a pas renvoyé d’URL de paiement')
  log('info', 'billing.checkout.created', { userId, plan, billingCycle })
  return { url: session.url }
}

/**
 * Résiliation : l'abonnement Stripe n'est pas supprimé mais marqué
 * `cancel_at_period_end` — les avantages restent acquis jusqu'à la fin de la
 * période déjà payée, puis Stripe émet `customer.subscription.deleted`.
 */
export async function cancelSubscription(userId: string) {
  const sub = await getOrCreateSubscription(userId)

  if (sub.plan === 'STARTER') {
    throw new ApiError(400, 'Aucun abonnement payant à résilier', 'NOTHING_TO_CANCEL')
  }
  if (sub.cancelAtPeriodEnd) {
    throw new ApiError(400, 'La résiliation est déjà programmée', 'ALREADY_CANCELLED')
  }

  if (sub.stripeSubscriptionId) {
    const s = requireStripe()
    await s.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true })
    // Le webhook customer.subscription.updated confirmera ; on reflète tout de
    // suite l'intention côté base pour une UI immédiate.
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        cancelAtPeriodEnd: true,
        events: { create: { type: 'CANCELED', fromPlan: sub.plan, toPlan: sub.plan } },
      },
      include: { events: { orderBy: { createdAt: 'desc' as const }, take: 20 } },
    })
    log('info', 'billing.cancel.scheduled', { userId, plan: sub.plan })
    return updated
  }

  // Abonnement hérité de la phase sans paiement : retour immédiat à Starter.
  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan: 'STARTER',
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      events: { create: { type: 'DOWNGRADED', fromPlan: sub.plan, toPlan: 'STARTER' } },
    },
    include: { events: { orderBy: { createdAt: 'desc' as const }, take: 20 } },
  })
  log('info', 'billing.cancel.legacy_downgrade', { userId, fromPlan: sub.plan })
  return updated
}

// ── Synchronisation depuis les webhooks ──────────────────────
// Un seul point d'entrée : l'objet Subscription de Stripe fait foi. Les
// métadonnées (userId/plan/cycle) posées à la création du checkout permettent
// de retrouver le joueur même si nos identifiants ne sont pas encore stockés.

function isPlanTier(value: string | undefined): value is PlanTier {
  return !!value && (PLAN_TIERS as readonly string[]).includes(value)
}

/** Fin de période courante — portée par l'item d'abonnement (API Stripe récentes). */
function periodEndOf(stripeSub: Stripe.Subscription): Date | null {
  const item = stripeSub.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined
  const seconds =
    item?.current_period_end ??
    (stripeSub as unknown as { current_period_end?: number }).current_period_end
  return seconds ? new Date(seconds * 1000) : null
}

export async function syncFromStripeSubscription(stripeSub: Stripe.Subscription): Promise<void> {
  const meta = stripeSub.metadata ?? {}
  const userId = meta.userId
  if (!userId || !isPlanTier(meta.plan)) {
    log('warn', 'billing.webhook.orphan_subscription', { stripeSubscriptionId: stripeSub.id })
    return
  }

  const sub = await getOrCreateSubscription(userId)
  const plan = meta.plan
  const billingCycle = meta.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY'
  const periodEnd = periodEndOf(stripeSub)
  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id
  const priceId = stripeSub.items?.data?.[0]?.price?.id ?? null

  // Abonnement Stripe terminé (résiliation arrivée à échéance, impayé final…).
  if (stripeSub.status === 'canceled' || stripeSub.status === 'incomplete_expired') {
    if (sub.stripeSubscriptionId !== stripeSub.id) return
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan: 'STARTER',
        status: 'ACTIVE',
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        events: { create: { type: 'EXPIRED', fromPlan: sub.plan, toPlan: 'STARTER' } },
      },
    })
    log('info', 'billing.subscription.ended', { userId, fromPlan: sub.plan })
    return
  }

  // Paiement initial non finalisé : on n'active rien.
  if (stripeSub.status === 'incomplete') return

  const status =
    stripeSub.status === 'past_due' || stripeSub.status === 'unpaid'
      ? 'PAST_DUE'
      : stripeSub.status === 'trialing'
        ? 'TRIALING'
        : 'ACTIVE'

  // Type d'événement d'audit : activation, renouvellement ou simple mise à jour.
  const isActivation = sub.stripeSubscriptionId !== stripeSub.id || sub.plan !== plan
  const isRenewal =
    !isActivation &&
    !!periodEnd &&
    !!sub.currentPeriodEnd &&
    periodEnd.getTime() > sub.currentPeriodEnd.getTime()

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan,
      billingCycle,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      stripePriceId: priceId,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      ...(isActivation ? { startedAt: new Date() } : {}),
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      ...(isActivation
        ? {
            events: {
              create: {
                type: PLAN_RANK[plan] >= PLAN_RANK[sub.plan] ? 'UPGRADED' : 'DOWNGRADED',
                fromPlan: sub.plan,
                toPlan: plan,
              },
            },
          }
        : isRenewal
          ? { events: { create: { type: 'RENEWED', fromPlan: plan, toPlan: plan } } }
          : {}),
    },
  })
  log('info', 'billing.subscription.synced', {
    userId,
    plan,
    status,
    activation: isActivation,
    renewal: isRenewal,
  })
}

/** Échec de prélèvement : l'abonnement passe en impayé (Stripe va réessayer). */
export async function markPastDueByCustomer(customerId: string): Promise<void> {
  const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } })
  if (!sub || sub.plan === 'STARTER') return
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'PAST_DUE' },
  })
  log('warn', 'billing.payment.failed', { userId: sub.userId, plan: sub.plan })
}
