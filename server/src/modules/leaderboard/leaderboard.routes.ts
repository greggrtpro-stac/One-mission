import type { LeaderboardEntry, LeaderboardResponse } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'

const TOP_SIZE = 50

const publicFields = {
  id: true,
  username: true,
  avatarUrl: true,
  level: true,
  totalXp: true,
  currentStreak: true,
} as const

type Row = { id: string } & Omit<LeaderboardEntry, 'rank' | 'isMe'>

function toEntry(row: Row, rank: number, meId: string): LeaderboardEntry {
  return {
    rank,
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

  const [top, totalPlayers, me] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ totalXp: 'desc' }, { createdAt: 'asc' }],
      take: TOP_SIZE,
      select: publicFields,
    }),
    prisma.user.count(),
    prisma.user.findUnique({
      where: { id: meId },
      select: { ...publicFields, createdAt: true },
    }),
  ])
  if (!me) throw new ApiError(404, 'Utilisateur introuvable')

  const entries = top.map((row, i) => toEntry(row, i + 1, meId))

  let meEntry = entries.find((e) => e.isMe)
  if (!meEntry) {
    // Hors du top : son rang = joueurs strictement devant lui + 1 (même tri).
    const ahead = await prisma.user.count({
      where: {
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
