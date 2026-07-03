import type { PublicUser } from '@one-mission/shared'
import type { User } from '../../generated/prisma/client.js'

/** Ne jamais renvoyer le hash de mot de passe ni le googleId au client. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    theme: user.theme,
    level: user.level,
    totalXp: user.totalXp,
    currentXp: user.currentXp,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    hasPassword: Boolean(user.passwordHash),
    createdAt: user.createdAt.toISOString(),
  }
}
