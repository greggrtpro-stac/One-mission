import argon2 from 'argon2'
import { OAuth2Client } from 'google-auth-library'
import { env } from '../../config/env.js'
import type { User } from '../../generated/prisma/client.js'
import { signAccessToken } from '../../lib/jwt.js'
import { sendPasswordResetEmail } from '../../lib/mailer.js'
import { prisma } from '../../lib/prisma.js'
import { generateToken, hashToken } from '../../lib/tokens.js'
import { ApiError } from '../../middleware/error.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours
const RESET_TTL_MS = 60 * 60 * 1000 // 1 heure

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null

// ── Sessions (refresh tokens rotatifs) ───────────────────────

export interface SessionMeta {
  userAgent: string | null
  ip: string | null
}

export async function issueRefreshToken(
  userId: string,
  meta: SessionMeta,
  /** Rotation : conserve l'identité de session et sa date de connexion. */
  carryOver?: { familyId: string; connectedAt: Date },
): Promise<string> {
  const token = generateToken()
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: meta.userAgent,
      ip: meta.ip,
      ...(carryOver ? { familyId: carryOver.familyId, connectedAt: carryOver.connectedAt } : {}),
    },
  })
  return token
}

export async function rotateRefreshToken(
  rawToken: string,
  meta: SessionMeta,
): Promise<{ user: User; refreshToken: string; accessToken: string }> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  })

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new ApiError(401, 'Session expirée, reconnecte-toi', 'INVALID_REFRESH')
  }

  // Rotation : l'ancien token est révoqué, un nouveau est émis dans la même
  // famille (même session « appareil », date de connexion d'origine conservée).
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  })
  const refreshToken = await issueRefreshToken(record.userId, meta, {
    familyId: record.familyId,
    connectedAt: record.connectedAt,
  })

  return {
    user: record.user,
    refreshToken,
    accessToken: signAccessToken(record.userId),
  }
}

/** Famille (session) du token porté par le cookie, si encore actif. */
export async function findSessionFamilyByToken(rawToken: string): Promise<string | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { familyId: true, revokedAt: true, expiresAt: true },
  })
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null
  return record.familyId
}

/** Sessions actives (une par appareil) : tokens ni révoqués ni expirés. */
export function listActiveSessions(userId: string) {
  return prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      familyId: true,
      userAgent: true,
      ip: true,
      connectedAt: true,
      lastUsedAt: true,
    },
  })
}

/**
 * Révoque une session (toute la famille de tokens) de l'utilisateur.
 * Renvoie true si au moins un token actif a été révoqué.
 */
export async function revokeSessionFamily(userId: string, familyId: string): Promise<boolean> {
  const { count } = await prisma.refreshToken.updateMany({
    where: { userId, familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return count > 0
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

// ── Inscription / connexion ──────────────────────────────────

export async function register(input: RegisterInput): Promise<User> {
  const email = input.email.toLowerCase()

  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username: input.username } }),
  ])
  if (emailTaken) throw new ApiError(409, 'Un compte existe déjà avec cet e-mail', 'EMAIL_TAKEN')
  if (usernameTaken) throw new ApiError(409, 'Ce pseudo est déjà pris', 'USERNAME_TAKEN')

  const passwordHash = await argon2.hash(input.password)
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      username: input.username,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    },
  })
}

export async function login(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
  // Message identique dans tous les cas d'échec : pas d'énumération de comptes.
  const invalid = new ApiError(401, 'E-mail ou mot de passe incorrect', 'INVALID_CREDENTIALS')

  if (!user) throw invalid
  if (!user.passwordHash) {
    throw new ApiError(401, 'Ce compte utilise la connexion Google', 'GOOGLE_ONLY')
  }
  const ok = await argon2.verify(user.passwordHash, input.password)
  if (!ok) throw invalid
  return user
}

// ── Google ───────────────────────────────────────────────────

async function uniqueUsernameFrom(base: string): Promise<string> {
  const cleaned =
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9_.-]/g, '')
      .slice(0, 16) || 'joueur'

  let candidate = cleaned
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.user.findUnique({ where: { username: candidate } })
    if (!exists) return candidate
    candidate = `${cleaned}${Math.floor(1000 + Math.random() * 9000)}`
  }
  throw new ApiError(500, 'Impossible de générer un pseudo unique')
}

export async function googleAuth(credential: string): Promise<User> {
  if (!googleClient) {
    throw new ApiError(503, 'La connexion Google n’est pas configurée sur ce serveur', 'GOOGLE_DISABLED')
  }

  const ticket = await googleClient
    .verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID })
    .catch(() => {
      throw new ApiError(401, 'Jeton Google invalide', 'INVALID_GOOGLE_TOKEN')
    })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email) {
    throw new ApiError(401, 'Jeton Google incomplet', 'INVALID_GOOGLE_TOKEN')
  }

  const email = payload.email.toLowerCase()

  const byGoogleId = await prisma.user.findUnique({ where: { googleId: payload.sub } })
  if (byGoogleId) return byGoogleId

  // Compte e-mail existant → on y rattache Google.
  const byEmail = await prisma.user.findUnique({ where: { email } })
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: payload.sub, avatarUrl: byEmail.avatarUrl ?? payload.picture ?? null },
    })
  }

  // Nouveau joueur.
  const username = await uniqueUsernameFrom(payload.given_name ?? email.split('@')[0] ?? 'joueur')
  return prisma.user.create({
    data: {
      email,
      googleId: payload.sub,
      username,
      firstName: payload.given_name ?? null,
      lastName: payload.family_name ?? null,
      avatarUrl: payload.picture ?? null,
    },
  })
}

// ── Réinitialisation de mot de passe ─────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  // Réponse identique que le compte existe ou non (pas d'énumération).
  if (!user) return

  const token = generateToken()
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  })

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`
  await sendPasswordResetEmail(user.email, resetUrl)
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'Lien invalide ou expiré, refais une demande', 'INVALID_RESET_TOKEN')
  }

  const passwordHash = await argon2.hash(newPassword)
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Toutes les sessions existantes sont invalidées par sécurité.
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
}
