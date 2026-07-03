import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'
import { ApiError } from './error.js'

/** Exige un access token valide (`Authorization: Bearer <jwt>`). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  const userId = token ? verifyAccessToken(token) : null

  if (!userId) {
    throw new ApiError(401, 'Authentification requise', 'UNAUTHENTICATED')
  }
  req.userId = userId
  next()
}

/** À utiliser dans les handlers derrière requireAuth. */
export function getUserId(req: Request): string {
  if (!req.userId) throw new ApiError(401, 'Authentification requise', 'UNAUTHENTICATED')
  return req.userId
}
