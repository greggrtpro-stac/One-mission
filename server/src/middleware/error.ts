import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { isProd } from '../config/env.js'

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

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, code: err.code, details: err.details })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Données invalides',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
    return
  }
  console.error('Erreur non gérée :', err)
  res.status(500).json({
    error: isProd ? 'Erreur interne du serveur' : String(err instanceof Error ? err.message : err),
  })
}
