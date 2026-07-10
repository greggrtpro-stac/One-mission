import { BILLING_CYCLES } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { ApiError } from '../../middleware/error.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { cancelSubscription, createCheckoutSession } from './stripe.service.js'
import { changePlan, getOrCreateSubscription, toSubscriptionDto } from './subscriptions.service.js'

const changePlanSchema = z.object({
  plan: z.literal('STARTER'),
  billingCycle: z.enum(BILLING_CYCLES).default('MONTHLY'),
})

const checkoutSchema = z.object({
  plan: z.enum(['PRO', 'MAX']),
  billingCycle: z.enum(BILLING_CYCLES).default('MONTHLY'),
  billing: z.object({
    firstName: z.string().min(1, 'Prénom requis').max(50),
    lastName: z.string().min(1, 'Nom requis').max(50),
    address: z.string().min(3, 'Adresse requise').max(200),
    postalCode: z.string().min(2, 'Code postal requis').max(12),
    city: z.string().min(1, 'Ville requise').max(80),
    country: z.string().regex(/^[A-Z]{2}$/, 'Pays invalide (code ISO)'),
  }),
})

export const subscriptionsRouter = Router()
subscriptionsRouter.use(requireAuth)

/** Abonnement du joueur connecté (créé en STARTER au premier appel). */
subscriptionsRouter.get('/me', async (req: Request, res: Response) => {
  const sub = await getOrCreateSubscription(getUserId(req))
  res.json({ subscription: toSubscriptionDto(sub) })
})

/**
 * SÉCURITÉ : cette route n'accepte plus que le retour à STARTER (gratuit),
 * et uniquement s'il n'y a pas d'abonnement Stripe actif (il faut d'abord
 * résilier). Les offres payantes passent obligatoirement par le paiement
 * (`POST /checkout`) puis par la confirmation webhook de Stripe.
 */
subscriptionsRouter.post(
  '/me/plan',
  validateBody(changePlanSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(req)
    const { plan, billingCycle } = req.body as z.infer<typeof changePlanSchema>

    const current = await getOrCreateSubscription(userId)
    if (current.stripeSubscriptionId) {
      throw new ApiError(
        400,
        'Résilie d’abord ton abonnement depuis « Mon abonnement » — tes avantages restent acquis jusqu’à la fin de la période payée',
        'CANCEL_FIRST',
      )
    }

    const sub = await changePlan(userId, plan, billingCycle)
    res.json({ subscription: toSubscriptionDto(sub) })
  },
)

/** Démarre un paiement Stripe Checkout — n'active rien par lui-même. */
subscriptionsRouter.post(
  '/checkout',
  validateBody(checkoutSchema),
  async (req: Request, res: Response) => {
    const { plan, billingCycle, billing } = req.body as z.infer<typeof checkoutSchema>
    const { url } = await createCheckoutSession(getUserId(req), plan, billingCycle, billing)
    res.json({ url })
  },
)

/** Résilie l'abonnement payant (fin de période — avantages conservés d'ici là). */
subscriptionsRouter.post('/cancel', async (req: Request, res: Response) => {
  const sub = await cancelSubscription(getUserId(req))
  res.json({ subscription: toSubscriptionDto(sub) })
})
