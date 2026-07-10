import type { Request, Response } from 'express'
import type Stripe from 'stripe'
import { env } from '../../config/env.js'
import { log } from '../../lib/log.js'
import { stripe } from '../../lib/stripe.js'
import { markPastDueByCustomer, syncFromStripeSubscription } from './stripe.service.js'

/**
 * Webhook Stripe — SEUL point d'activation des abonnements payants.
 *
 * Sécurité : la signature `stripe-signature` est vérifiée sur le corps BRUT
 * (ce handler est monté AVANT express.json dans app.ts). Une requête non
 * signée par Stripe est rejetée : le frontend ne peut rien activer.
 *
 * Le pilotage se fait par l'objet Subscription (created/updated/deleted),
 * qui porte nos métadonnées userId/plan/cycle posées au checkout.
 */
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Webhook Stripe non configuré' })
    return
  }

  let event: Stripe.Event
  try {
    const signature = req.headers['stripe-signature']
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature as string,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    log('warn', 'billing.webhook.bad_signature', {
      message: err instanceof Error ? err.message : String(err),
    })
    res.status(400).json({ error: 'Signature invalide' })
    return
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncFromStripeSubscription(event.data.object)
        break

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) await markPastDueByCustomer(customerId)
        break
      }

      case 'checkout.session.completed':
        // L'activation elle-même arrive via customer.subscription.created ;
        // on trace simplement la complétion du paiement.
        log('info', 'billing.checkout.completed', {
          sessionId: event.data.object.id,
          userId: event.data.object.metadata?.userId ?? null,
        })
        break

      default:
        log('debug', 'billing.webhook.ignored', { type: event.type })
    }
  } catch (err) {
    // 500 → Stripe réessaiera automatiquement (idempotence assurée par sync).
    log('error', 'billing.webhook.handler_failed', {
      type: event.type,
      message: err instanceof Error ? err.message : String(err),
    })
    res.status(500).json({ error: 'Traitement du webhook échoué' })
    return
  }

  res.json({ received: true })
}
