import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

/**
 * Chaque appel aux endpoints IA (coach, analyse de journal) coûte de l'argent
 * (API Anthropic) : on limite par utilisateur pour empêcher qu'un script ne
 * fasse exploser la facture. 30 appels / 15 min laissent une conversation
 * fluide tout en bloquant l'abus.
 */
export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
  message: { error: "Trop d'appels au coach IA, réessaie dans quelques minutes" },
})
