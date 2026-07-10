import {
  DEFAULT_COMMUNICATION_PREFS,
  DEFAULT_NOTIFICATIONS,
  LANGUAGES,
  type CommunicationPrefs,
  type Language,
  type NotificationPrefs,
  type PublicUser,
} from '@one-mission/shared'
import type { User } from '../../generated/prisma/client.js'

/** Ne jamais renvoyer le hash de mot de passe, le googleId ni le secret 2FA au client. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    theme: user.theme,
    language: (LANGUAGES as readonly string[]).includes(user.language)
      ? (user.language as Language)
      : 'fr',
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...((user.notifications ?? {}) as Partial<NotificationPrefs>),
    },
    showOnLeaderboard: user.showOnLeaderboard,
    newsletterOptIn: user.newsletterOptIn,
    communicationPrefs: {
      ...DEFAULT_COMMUNICATION_PREFS,
      ...((user.communicationPrefs ?? {}) as Partial<CommunicationPrefs>),
      // Jamais désactivables, même si une valeur invalide traînait en base.
      accountSecurity: true,
    },
    twoFactorEnabled: user.twoFactorEnabled,
    level: user.level,
    totalXp: user.totalXp,
    currentXp: user.currentXp,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    hasPassword: Boolean(user.passwordHash),
    hasGoogle: Boolean(user.googleId),
    createdAt: user.createdAt.toISOString(),
  }
}
