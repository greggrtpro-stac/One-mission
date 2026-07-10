import { env, isProd } from '../config/env.js'
import { log } from './log.js'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

let warnedUnconfigured = false

/**
 * Vérifie un jeton Cloudflare Turnstile côté serveur — jamais confiance au
 * seul frontend. Si `TURNSTILE_SECRET_KEY` n'est pas configurée (développement
 * local sans clés Cloudflare), la vérification est court-circuitée pour ne
 * pas bloquer le développement, comme le fait déjà Google OAuth quand
 * `GOOGLE_CLIENT_ID` est vide. En production sans clé, un avertissement est
 * journalisé à chaque tentative : les formulaires ne sont alors plus protégés.
 */
export async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (isProd && !warnedUnconfigured) {
      warnedUnconfigured = true
      log('warn', 'turnstile.unconfigured', {})
    }
    return true
  }
  if (typeof token !== 'string' || !token) return false

  try {
    const params = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
    if (ip) params.set('remoteip', ip)

    const res = await fetch(VERIFY_URL, { method: 'POST', body: params })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (err) {
    // Panne de l'API Cloudflare : on referme la porte plutôt que de l'ouvrir.
    log('warn', 'turnstile.verify_error', { message: err instanceof Error ? err.message : String(err) })
    return false
  }
}
