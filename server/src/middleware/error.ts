import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { isProd } from '../config/env.js'

/**
 * Journal d'erreurs structuré (une ligne JSON par erreur) : date, utilisateur
 * connecté le cas échéant, route touchée, statut et message. La stack trace
 * n'est émise qu'en développement. Un collecteur (pino, Sentry…) pourra se
 * brancher ici sans toucher au reste du code.
 */
function logServerError(req: Request, err: unknown, status: number) {
  const entry = {
    date: new Date().toISOString(),
    status,
    method: req.method,
    path: req.originalUrl,
    userId: req.userId ?? null,
    message: err instanceof Error ? err.message : String(err),
    ...(isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  }
  console.error('[api-error]', JSON.stringify(entry))
}

/** Erreur métier avec code HTTP, à lancer depuis les services/contrôleurs. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    /** Données structurées renvoyées au client (ex. offre requise pour UPGRADE_REQUIRED). */
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.path}` })
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    // Les 4xx sont des refus métier normaux (validation, droits) : pas de bruit
    // dans le journal. Les 5xx portés par une ApiError restent journalisés.
    if (err.status >= 500) logServerError(req, err, err.status)
    res.status(err.status).json({ error: err.message, code: err.code, details: err.details })
    return
  }
  if (err instanceof ZodError) {
    // Le message de la première règle violée est renvoyé tel quel : le client
    // affiche ainsi la vraie cause (« Le mot de passe doit contenir une
    // majuscule. »…) au lieu d'un « Données invalides » générique. La liste
    // complète reste disponible dans `details` pour un affichage par champ.
    const issues = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    res.status(400).json({
      error: issues[0]?.message ?? 'Une erreur est survenue. Veuillez réessayer plus tard.',
      code: 'VALIDATION_ERROR',
      details: issues,
    })
    return
  }
  // Corps JSON malformé (body-parser) : faute du client, pas erreur serveur.
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Corps de requête JSON invalide' })
    return
  }
  logServerError(req, err, 500)
  res.status(500).json({
    error: isProd
      ? 'Une erreur est survenue. Veuillez réessayer plus tard.'
      : String(err instanceof Error ? err.message : err),
  })
}
