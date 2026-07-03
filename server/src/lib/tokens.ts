import crypto from 'node:crypto'

/** Token opaque aléatoire (refresh, réinitialisation de mot de passe). */
export function generateToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

/** Seul le hash est stocké en base : un vol de base ne compromet pas les tokens. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
