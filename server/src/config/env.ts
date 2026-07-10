import { z } from 'zod'

/**
 * Variables d'environnement validées au démarrage.
 * Le serveur refuse de démarrer si une variable obligatoire manque.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET trop court (16 caractères min)'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET trop court (16 caractères min)'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),

  // Cloudflare Turnstile (dash.cloudflare.com) — vide = anti-robot désactivé,
  // utile en développement local. Voir lib/turnstile.ts pour le garde-fou prod.
  TURNSTILE_SITE_KEY: z.string().optional().default(''),
  TURNSTILE_SECRET_KEY: z.string().optional().default(''),

  ANTHROPIC_API_KEY: z.string().optional().default(''),

  // Paiement Stripe — vides tant que le paiement n'est pas configuré :
  // le checkout renvoie alors une erreur claire, rien n'est activé.
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional().default(''),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional().default(''),
  STRIPE_PRICE_MAX_MONTHLY: z.string().optional().default(''),
  STRIPE_PRICE_MAX_YEARLY: z.string().optional().default(''),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().optional().default('One Mission <no-reply@one-mission.fr>'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Configuration invalide :')
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')} — ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
