import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import { ApiError } from './error.js'

/**
 * Présence : User.lastSeenAt est rafraîchi au fil des requêtes authentifiées,
 * au plus une écriture par minute et par utilisateur (jamais bloquant — un
 * échec d'écriture n'affecte pas la requête en cours). Alimente le statut
 * « En ligne / Hors ligne » et la « dernière connexion » du système d'amis.
 */
const LAST_SEEN_WRITE_INTERVAL_MS = 60_000
const lastSeenWrittenAt = new Map<string, number>()

function touchLastSeen(userId: string) {
  const now = Date.now()
  const previous = lastSeenWrittenAt.get(userId)
  if (previous !== undefined && now - previous < LAST_SEEN_WRITE_INTERVAL_MS) return
  lastSeenWrittenAt.set(userId, now)
  void prisma.user
    .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
    .catch(() => lastSeenWrittenAt.delete(userId))
}

/** Exige un access token valide (`Authorization: Bearer <jwt>`). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  const userId = token ? verifyAccessToken(token) : null

  if (!userId) {
    throw new ApiError(401, 'Authentification requise', 'UNAUTHENTICATED')
  }
  req.userId = userId
  touchLastSeen(userId)
  next()
}

/** À utiliser dans les handlers derrière requireAuth. */
export function getUserId(req: Request): string {
  if (!req.userId) throw new ApiError(401, 'Authentification requise', 'UNAUTHENTICATED')
  return req.userId
}
