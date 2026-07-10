import type { NextFunction, Request, Response } from 'express'
import { verifyTurnstile } from '../lib/turnstile.js'
import { ApiError } from './error.js'

/**
 * Exige un jeton Turnstile valide dans `req.body.turnstileToken`.
 * À poser APRÈS `validateBody` (qui garantit déjà la présence de la chaîne) :
 * ce middleware fait l'appel réseau vers Cloudflare et rejette la requête
 * avant qu'elle n'atteigne la logique métier si la vérification échoue.
 */
export function requireTurnstile() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const ok = await verifyTurnstile(req.body?.turnstileToken, req.ip ?? null)
    if (!ok) {
      throw new ApiError(400, 'Vérification anti-robot échouée, réessaie.', 'TURNSTILE_FAILED')
    }
    next()
  }
}
