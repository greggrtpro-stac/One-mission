import crypto from 'node:crypto'
import type { TwoFactorPurpose } from '../../generated/prisma/client.js'
import { hashToken } from '../../lib/tokens.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'

/**
 * 2FA par SMS — ARCHITECTURE PRÉPARÉE, NON ACTIVÉE.
 * Aucune route ne branche encore ces fonctions sur la connexion : elles
 * posent le socle (codes temporaires hachés, expiration courte, usage
 * unique, compteur de tentatives) pour activer le 2FA plus tard.
 *
 * Il manque volontairement : le fournisseur d'envoi SMS (Twilio, Vonage…),
 * les routes d'activation/vérification, et l'exigence du code à la connexion.
 */

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

/** Code à 6 chiffres, généré par un aléa cryptographique. */
function generateSmsCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

/**
 * Crée un code temporaire pour l'utilisateur (invalide les précédents du
 * même usage) et renvoie le code EN CLAIR — à remettre au futur fournisseur
 * SMS uniquement, jamais au client HTTP ni aux logs.
 */
export async function createTwoFactorCode(
  userId: string,
  purpose: TwoFactorPurpose,
): Promise<string> {
  const code = generateSmsCode()
  await prisma.$transaction([
    prisma.twoFactorCode.deleteMany({
      where: { OR: [{ userId, purpose }, { expiresAt: { lt: new Date() } }] },
    }),
    prisma.twoFactorCode.create({
      data: {
        userId,
        purpose,
        codeHash: hashToken(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ])
  return code
}

/**
 * Vérifie un code : usage unique, expiration, et au plus {@link MAX_ATTEMPTS}
 * essais avant invalidation (anti force brute sur 6 chiffres).
 */
export async function verifyTwoFactorCode(
  userId: string,
  purpose: TwoFactorPurpose,
  code: string,
): Promise<boolean> {
  const record = await prisma.twoFactorCode.findFirst({
    where: { userId, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return false

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.twoFactorCode.delete({ where: { id: record.id } })
    return false
  }

  const match = crypto.timingSafeEqual(
    Buffer.from(record.codeHash),
    Buffer.from(hashToken(code)),
  )
  if (!match) {
    await prisma.twoFactorCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return false
  }

  // Usage unique : le code consommé est supprimé.
  await prisma.twoFactorCode.delete({ where: { id: record.id } })
  return true
}

/** Enregistre le numéro 2FA (à appeler après vérification ENROLLMENT réussie). */
export async function activateTwoFactor(userId: string, phone: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorPhone: phone,
      twoFactorPhoneVerifiedAt: new Date(),
    },
  })
}

export async function deactivateTwoFactor(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new ApiError(404, 'Utilisateur introuvable')
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorPhone: null, twoFactorPhoneVerifiedAt: null },
    }),
    prisma.twoFactorCode.deleteMany({ where: { userId } }),
  ])
}
