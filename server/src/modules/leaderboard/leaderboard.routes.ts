import type {
  LeaderboardEntry,
  LeaderboardResponse,
  PublicProfileResponse,
} from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { DEFAULT_FRIEND_PREFS, type FriendPrefs } from '@one-mission/shared'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { areFriends } from '../friends/friends.service.js'
import { computeProfileStats } from '../stats/stats.service.js'

const TOP_SIZE = 50

const publicFields = {
  id: true,
  username: true,
  avatarUrl: true,
  level: true,
  totalXp: true,
  currentStreak: true,
} as const

type Row = { id: string } & Omit<LeaderboardEntry, 'rank' | 'userId' | 'isMe'>

function toEntry(row: Row, rank: number, meId: string): LeaderboardEntry {
  return {
    rank,
    userId: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    level: row.level,
    totalXp: row.totalXp,
    currentStreak: row.currentStreak,
    isMe: row.id === meId,
  }
}

export const leaderboardRouter = Router()
leaderboardRouter.use(requireAuth)

leaderboardRouter.get('/', async (req: Request, res: Response) => {
  const meId = getUserId(req)

  // Confidentialité : seuls les joueurs qui l'acceptent apparaissent au classement.
  const [top, totalPlayers, me] = await Promise.all([
    prisma.user.findMany({
      where: { showOnLeaderboard: true },
      orderBy: [{ totalXp: 'desc' }, { createdAt: 'asc' }],
      take: TOP_SIZE,
      select: publicFields,
    }),
    prisma.user.count({ where: { showOnLeaderboard: true } }),
    prisma.user.findUnique({
      where: { id: meId },
      select: { ...publicFields, createdAt: true },
    }),
  ])
  if (!me) throw new ApiError(404, 'Utilisateur introuvable')

  const entries = top.map((row, i) => toEntry(row, i + 1, meId))

  let meEntry = entries.find((e) => e.isMe)
  if (!meEntry) {
    // Hors du top : son rang = joueurs visibles strictement devant lui + 1 (même tri).
    const ahead = await prisma.user.count({
      where: {
        showOnLeaderboard: true,
        id: { not: meId },
        OR: [
          { totalXp: { gt: me.totalXp } },
          { totalXp: me.totalXp, createdAt: { lt: me.createdAt } },
        ],
      },
    })
    meEntry = toEntry(me, ahead + 1, meId)
  }

  const response: LeaderboardResponse = { entries, me: meEntry, totalPlayers }
  res.json(response)
})

/**
 * Profil public d'un joueur du classement.
 * Confidentialité : 404 si le joueur n'existe pas OU a masqué son profil
 * (même réponse dans les deux cas, pour ne pas révéler son existence).
 * La réponse est construite en liste blanche : seuls les champs publics
 * sortent d'ici — jamais d'e-mail, de nom réel, de téléphone, de noms
 * d'addictions ni de contenu de journal.
 */
leaderboardRouter.get('/:userId', async (req: Request, res: Response) => {
  const meId = getUserId(req)
  const target = await prisma.user.findUnique({
    where: { id: req.params.userId as string },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      level: true,
      totalXp: true,
      currentXp: true,
      currentStreak: true,
      longestStreak: true,
      createdAt: true,
      showOnLeaderboard: true,
      friendPrefs: true,
    },
  })
  // Un profil masqué du classement reste visible par ses AMIS (l'amitié a été
  // acceptée explicitement) — pour tout autre joueur, même 404 qu'un profil
  // inexistant afin de ne pas révéler son existence.
  const visible =
    target && (target.showOnLeaderboard || (await areFriends(meId, target.id)))
  if (!target || !visible) throw new ApiError(404, 'Profil introuvable')

  const stats = await computeProfileStats(target)

  // Guilde du joueur (badge + rôle) — donnée publique par nature.
  const guildMembership = await prisma.guildMember.findUnique({
    where: { userId: target.id },
    select: {
      role: true,
      guild: { select: { id: true, name: true, icon: true, color: true } },
    },
  })

  // Statistiques d'addictions : uniquement si le joueur les a rendues publiques.
  const targetPrefs: FriendPrefs = {
    ...DEFAULT_FRIEND_PREFS,
    ...((target.friendPrefs ?? {}) as Partial<FriendPrefs>),
  }
  const showAddictions = targetPrefs.showAddictionsPublicly

  const response: PublicProfileResponse = {
    user: {
      id: target.id,
      username: target.username,
      avatarUrl: target.avatarUrl,
      level: target.level,
      totalXp: target.totalXp,
      currentXp: target.currentXp,
      currentStreak: target.currentStreak,
      longestStreak: target.longestStreak,
      createdAt: target.createdAt.toISOString(),
    },
    stats: {
      rank: stats.rank,
      totalPlayers: stats.totalPlayers,
      questsCreated: stats.questsCreated,
      questsDone: stats.questsDone,
      successRate: stats.successRate,
      mainQuestsDone: stats.mainQuestsDone,
      weeklyCompletions: stats.weeklyCompletions,
      focusSeconds: stats.focusSeconds,
      focusAvgSecondsPerDay: stats.focusAvgSecondsPerDay,
      deepworkSessions: stats.deepworkSessions,
      journalEntries: stats.journalEntries,
      addictionsCount: showAddictions ? stats.addictionsCount : null,
      longestCleanDays: showAddictions ? stats.longestCleanDays : null,
      days: stats.days,
      weeks: stats.weeks,
    },
    guild: guildMembership
      ? {
          id: guildMembership.guild.id,
          name: guildMembership.guild.name,
          icon: guildMembership.guild.icon,
          color: guildMembership.guild.color,
          role: guildMembership.role,
        }
      : null,
  }
  res.json(response)
})
