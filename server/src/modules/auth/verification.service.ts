import { env } from '../../config/env.js'
import { sendEmailVerificationEmail } from '../../lib/mailer.js'
import { prisma } from '../../lib/prisma.js'
import { generateToken, hashToken } from '../../lib/tokens.js'
import { ApiError } from '../../middleware/error.js'

/**
 * Vérification d'adresse e-mail — OBLIGATOIRE pour se connecter (voir
 * auth.service.ts#login). Un compte créé par e-mail/mot de passe reste
 * inutilisable (connexion refusée) tant que ce lien n'a pas été suivi.
 * Les comptes Google restent hors de ce parcours : Google a déjà prouvé la
 * propriété de l'adresse (voir auth.service.ts#googleAuth).
 */

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000 // 24 heures

/**
 * Génère un lien de vérification et l'envoie (un seul lien valide à la fois :
 * toute nouvelle demande révoque — supprime — les précédentes).
 * Le token est un aléa cryptographique de 48 octets (384 bits d'entropie) :
 * seul son empreinte SHA-256 est stockée en base, jamais la valeur en clair,
 * jamais dans les journaux. Sans confiance dans le secret serveur pour le
 * vérifier (contrairement à un JWT), il est par nature impossible à forger.
 */
export async function requestEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new ApiError(404, 'Utilisateur introuvable')
  if (user.emailVerifiedAt) return // déjà vérifié : rien à faire

  const token = generateToken()
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { OR: [{ userId }, { expiresAt: { lt: new Date() } }] },
    }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    }),
  ])

  // uid n'est qu'un identifiant public (comme dans l'URL du profil public déjà
  // exposée au classement) : il ne porte aucun secret et ne sert qu'à distinguer
  // « déjà vérifié » d'un lien réellement invalide si le token a été purgé entre-temps.
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}&uid=${user.id}`
  await sendEmailVerificationEmail(user.email, verifyUrl)
}

export type VerifyEmailStatus = 'success' | 'expired' | 'already_verified' | 'invalid'

/**
 * Consomme un lien de vérification (usage unique, supprimé après usage).
 * Distingue 4 issues pour l'écran affiché au joueur :
 *  - success : token valide, compte marqué vérifié à l'instant ;
 *  - expired : token trouvé mais expiré (pas encore purgé) ;
 *  - already_verified : token introuvable (déjà consommé) mais `uid` désigne
 *    un compte déjà vérifié — évite d'afficher une erreur sur un second clic
 *    du même lien ;
 *  - invalid : token introuvable et rien ne permet de le rattacher à un
 *    compte déjà vérifié (lien fabriqué, tronqué, ou purgé depuis longtemps).
 */
export async function verifyEmail(rawToken: string, uid?: string): Promise<VerifyEmailStatus> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  })

  if (record) {
    if (record.expiresAt < new Date()) return 'expired'
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    ])
    return 'success'
  }

  if (uid) {
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { emailVerifiedAt: true } })
    if (user?.emailVerifiedAt) return 'already_verified'
  }
  return 'invalid'
}

/**
 * Renvoi de l'e-mail de confirmation à partir de l'adresse saisie.
 * Ne révèle jamais si un compte existe : la fonction ne lève jamais d'erreur
 * et la route appelante renvoie systématiquement le même message générique.
 */
export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || user.emailVerifiedAt || !user.passwordHash) return
  await requestEmailVerification(user.id)
}
