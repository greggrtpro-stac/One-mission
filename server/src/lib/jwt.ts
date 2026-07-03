import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const ACCESS_TOKEN_TTL = '15m'

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

/** Renvoie l'id utilisateur si le token est valide, sinon null. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
    if (typeof payload === 'object' && typeof payload.sub === 'string') return payload.sub
    return null
  } catch {
    return null
  }
}
