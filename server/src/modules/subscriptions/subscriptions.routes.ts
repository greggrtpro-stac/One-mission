import { BILLING_CYCLES, PLAN_TIERS } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { changePlan, getOrCreateSubscription, toSubscriptionDto } from './subscriptions.service.js'

const changePlanSchema = z.object({
  plan: z.enum(PLAN_TIERS),
  billingCycle: z.enum(BILLING_CYCLES).default('MONTHLY'),
})

export const subscriptionsRouter = Router()
subscriptionsRouter.use(requireAuth)

/** Abonnement du joueur connecté (créé en STARTER au premier appel). */
subscriptionsRouter.get('/me', async (req: Request, res: Response) => {
  const sub = await getOrCreateSubscription(getUserId(req))
  res.json({ subscription: toSubscriptionDto(sub) })
})

/**
 * Changement d'offre — gratuit tant que le paiement n'est pas branché.
 * Avec Stripe, cette route renverra une URL de checkout à la place pour
 * les upgrades payants (le contrat client restera le même).
 */
subscriptionsRouter.post(
  '/me/plan',
  validateBody(changePlanSchema),
  async (req: Request, res: Response) => {
    const { plan, billingCycle } = req.body as z.infer<typeof changePlanSchema>
    const sub = await changePlan(getUserId(req), plan, billingCycle)
    res.json({ subscription: toSubscriptionDto(sub) })
  },
)
