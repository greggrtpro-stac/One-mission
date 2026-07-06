import {
  PLAN_RANK,
  type BillingCycle,
  type PlanTier,
  type SubscriptionDto,
  type SubscriptionEventDto,
} from '@one-mission/shared'
import type { Subscription, SubscriptionEvent } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { billingProvider } from './billing.provider.js'

type SubscriptionWithEvents = Subscription & { events: SubscriptionEvent[] }

const EVENTS_SHOWN = 20

const withEvents = {
  events: { orderBy: { createdAt: 'desc' as const }, take: EVENTS_SHOWN },
}

/**
 * Compte fondateur — reste sur l'offre Max en permanence, quoi qu'il arrive
 * (compte pré-existant, réinitialisation de données, etc.). L'id est résolu
 * une seule fois puis mis en cache pour ne pas re-frapper la base à chaque
 * requête ; on ne met en cache qu'un id trouvé, jamais une absence, pour ne
 * pas rater le compte s'il est créé après le démarrage du serveur.
 */
const FOUNDER_EMAIL = 'greggrt.pro@gmail.com'
let founderUserIdCache: string | null = null

async function isFounderAccount(userId: string): Promise<boolean> {
  if (founderUserIdCache === userId) return true
  const founder = await prisma.user.findUnique({
    where: { email: FOUNDER_EMAIL },
    select: { id: true },
  })
  if (founder) founderUserIdCache = founder.id
  return founder?.id === userId
}

/** Corrige l'abonnement du fondateur vers Max s'il ne l'est pas déjà. */
async function ensureFounderPlan(sub: SubscriptionWithEvents): Promise<SubscriptionWithEvents> {
  if (sub.plan === 'MAX' && sub.status === 'ACTIVE') return sub
  if (!(await isFounderAccount(sub.userId))) return sub

  return prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan: 'MAX',
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      events: { create: { type: 'UPGRADED', fromPlan: sub.plan, toPlan: 'MAX' } },
    },
    include: withEvents,
  })
}

function toEventDto(e: SubscriptionEvent): SubscriptionEventDto {
  return {
    id: e.id,
    type: e.type,
    fromPlan: e.fromPlan,
    toPlan: e.toPlan,
    createdAt: e.createdAt.toISOString(),
  }
}

export function toSubscriptionDto(sub: SubscriptionWithEvents): SubscriptionDto {
  return {
    plan: sub.plan,
    status: sub.status,
    billingCycle: sub.billingCycle,
    startedAt: sub.startedAt.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    promoCode: sub.promoCode,
    events: sub.events.map(toEventDto),
  }
}

/**
 * Abonnement de l'utilisateur, créé paresseusement en STARTER.
 * Tous les comptes (existants comme nouveaux) ont donc toujours une offre.
 */
export async function getOrCreateSubscription(userId: string): Promise<SubscriptionWithEvents> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    include: withEvents,
  })
  if (existing) return ensureFounderPlan(await rollPeriodIfNeeded(existing))

  const isFounder = await isFounderAccount(userId)
  return ensureFounderPlan(
    await prisma.subscription.create({
      data: {
        userId,
        plan: isFounder ? 'MAX' : 'STARTER',
        status: 'ACTIVE',
        events: { create: { type: 'CREATED', toPlan: isFounder ? 'MAX' : 'STARTER' } },
      },
      include: withEvents,
    }),
  )
}

/**
 * Tant que la facturation n'est pas branchée, une période échue est
 * simplement reconduite (renouvellement gratuit). Avec Stripe, ce sont les
 * webhooks (invoice.paid / customer.subscription.updated) qui piloteront
 * le renouvellement et les passages en PAST_DUE/EXPIRED.
 */
async function rollPeriodIfNeeded(sub: SubscriptionWithEvents): Promise<SubscriptionWithEvents> {
  const now = new Date()
  if (sub.status !== 'ACTIVE' || !sub.currentPeriodEnd || sub.currentPeriodEnd > now) return sub

  let end = sub.currentPeriodEnd
  while (end <= now) end = billingProvider.nextPeriodEnd(end, sub.billingCycle)

  return prisma.subscription.update({
    where: { id: sub.id },
    data: { currentPeriodEnd: end },
    include: withEvents,
  })
}

/**
 * Offre effective pour les permissions : un abonnement inexistant, annulé
 * ou expiré retombe sur STARTER. Lecture seule (pas de création paresseuse).
 */
export async function getEffectivePlan(userId: string): Promise<PlanTier> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { id: true, plan: true, status: true },
  })
  if (!sub) return (await isFounderAccount(userId)) ? 'MAX' : 'STARTER'
  if (sub.plan === 'MAX' && sub.status === 'ACTIVE') return 'MAX'
  if (await isFounderAccount(userId)) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { plan: 'MAX', status: 'ACTIVE', cancelAtPeriodEnd: false },
    })
    return 'MAX'
  }
  return sub.status === 'ACTIVE' || sub.status === 'TRIALING' ? sub.plan : 'STARTER'
}

/**
 * Changement d'offre. Gratuit et immédiat tant que le paiement n'est pas
 * branché ; la logique de facturation vit dans le BillingProvider.
 */
export async function changePlan(
  userId: string,
  plan: PlanTier,
  billingCycle: BillingCycle,
): Promise<SubscriptionWithEvents> {
  const current = await getOrCreateSubscription(userId)

  if (current.plan === plan && current.billingCycle === billingCycle) {
    throw new ApiError(400, 'Tu es déjà sur cette offre', 'ALREADY_ON_PLAN')
  }

  if (plan !== 'MAX' && (await isFounderAccount(userId))) {
    throw new ApiError(400, 'Ce compte dispose de l’offre Max en permanence', 'FOUNDER_LOCKED_MAX')
  }

  const quote = await billingProvider.changePlan({ userId, plan, billingCycle })

  const type =
    current.plan === plan
      ? 'CYCLE_CHANGED'
      : PLAN_RANK[plan] > PLAN_RANK[current.plan]
        ? 'UPGRADED'
        : 'DOWNGRADED'

  return prisma.subscription.update({
    where: { id: current.id },
    data: {
      plan,
      billingCycle,
      status: quote.status,
      startedAt: new Date(),
      currentPeriodEnd: quote.currentPeriodEnd,
      trialEndsAt: quote.trialEndsAt,
      discountPercent: quote.discountPercent,
      cancelAtPeriodEnd: false,
      events: {
        create: { type, fromPlan: current.plan, toPlan: plan },
      },
    },
    include: withEvents,
  })
}
