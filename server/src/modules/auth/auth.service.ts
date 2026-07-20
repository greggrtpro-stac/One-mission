import { OAuth2Client } from 'google-auth-library'
import { env } from '../../config/env.js'
import type { User } from '../../generated/prisma/client.js'
import { signAccessToken } from '../../lib/jwt.js'
import { sendPasswordResetEmail } from '../../lib/mailer.js'
import { hashPassword, verifyPassword } from '../../lib/passwords.js'
import { prisma } from '../../lib/prisma.js'
import { generateToken, hashToken } from '../../lib/tokens.js'
import { ApiError } from '../../middleware/error.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'
import { requestEmailVerification } from './verification.service.js'

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
  if (emailTaken) throw new ApiError(409, 'Cette adresse e-mail est déjà utilisée.', 'EMAIL_TAKEN')
  if (usernameTaken) throw new ApiError(409, 'Ce pseudo est déjà utilisé.', 'USERNAME_TAKEN')

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      username: input.username,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    },
  })

  // Compte créé mais inutilisable tant que l'e-mail n'est pas confirmé
  // (voir login ci-dessous) : l'envoi fait partie intégrante de l'inscription.
  await requestEmailVerification(user.id)
  return user
}

export async function login(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
  // Message identique dans tous les cas d'échec : pas d'énumération de comptes.
  const invalid = new ApiError(401, 'Adresse e-mail ou mot de passe incorrect.', 'INVALID_CREDENTIALS')

  if (!user) throw invalid
  if (!user.passwordHash) {
    throw new ApiError(401, 'Ce compte utilise la connexion Google', 'GOOGLE_ONLY')
  }
  const ok = await verifyPassword(user.passwordHash, input.password)
  if (!ok) throw invalid

  // Vérifié APRÈS le mot de passe : seul le propriétaire du compte (qui vient
  // de le prouver) apprend que l'e-mail n'est pas confirmé — aucune énumération
  // possible pour qui n'a pas le bon mot de passe.
  if (!user.emailVerifiedAt) {
    throw new ApiError(
      403,
      'Vous devez confirmer votre adresse e-mail avant de vous connecter.',
      'EMAIL_NOT_VERIFIED',
    )
  }
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

  // Compte e-mail existant → on y rattache Google. Google ayant déjà prouvé la
  // propriété de l'adresse, un compte pas encore vérifié le devient au passage.
  const byEmail = await prisma.user.findUnique({ where: { email } })
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: payload.sub,
        avatarUrl: byEmail.avatarUrl ?? payload.picture ?? null,
        emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
      },
    })
  }

  // Nouveau joueur : Google a déjà vérifié l'adresse, aucun e-mail de
  // confirmation à envoyer.
  const username = await uniqueUsernameFrom(payload.given_name ?? email.split('@')[0] ?? 'joueur')
  return prisma.user.create({
    data: {
      email,
      googleId: payload.sub,
      username,
      firstName: payload.given_name ?? null,
      lastName: payload.family_name ?? null,
      avatarUrl: payload.picture ?? null,
      emailVerifiedAt: new Date(),
    },
  })
}

// ── Réinitialisation de mot de passe ─────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  // Choix produit assumé : on indique clairement qu'aucun compte n'existe.
  // L'énumération que cela permet est déjà possible via l'inscription
  // (EMAIL_TAKEN) ; la route reste protégée par Turnstile + rate limit (5/h).
  if (!user) {
    throw new ApiError(404, 'Aucun compte n’est associé à cette adresse e-mail.', 'EMAIL_NOT_FOUND')
  }

  const token = generateToken()
  await prisma.$transaction([
    // Un seul lien valide à la fois : chaque demande invalide les précédentes,
    // et les liens expirés sont purgés au passage.
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ userId: user.id }, { expiresAt: { lt: new Date() } }] },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    }),
  ])

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`
  await sendPasswordResetEmail(user.email, resetUrl)
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  })
  // Lien inconnu (falsifié ou déjà remplacé) ≠ lien expiré / déjà utilisé :
  // deux messages distincts pour que l'utilisateur sache s'il doit simplement
  // refaire une demande ou vérifier qu'il a bien ouvert le dernier e-mail reçu.
  if (!record) {
    throw new ApiError(400, 'Le lien est invalide.', 'INVALID_RESET_TOKEN')
  }
  if (record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'Le lien est expiré.', 'EXPIRED_RESET_TOKEN')
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.$transaction([
    // Usage unique : le lien utilisé (et tout autre lien du compte) est supprimé.
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Toutes les sessions existantes sont invalidées par sécurité.
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
}
