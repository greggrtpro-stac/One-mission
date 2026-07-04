import type { DashboardSummary } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** Citation du jour : déterministe (même citation toute la journée). */
async function dailyQuote() {
  const count = await prisma.quote.count()
  if (count === 0) return { text: 'Une vie. Une mission.', author: 'One Mission' }
  const index = Math.floor(Date.now() / DAY_MS) % count
  const quote = await prisma.quote.findMany({ skip: index, take: 1 })
  const q = quote[0]
  return q ? { text: q.text, author: q.author } : { text: 'Une vie. Une mission.', author: null }
}

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth)

dashboardRouter.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))

  const [quote, deepWork, addictions, journal, questsDoneToday] = await Promise.all([
    dailyQuote(),
    prisma.deepWorkSession.aggregate({
      where: { userId, kind: 'FOCUS', startedAt: { gte: startOfDay } },
      _sum: { duration: true },
    }),
    prisma.addiction.findMany({ where: { userId }, select: { startDate: true } }),
    prisma.journalEntry.findFirst({ where: { userId, date: todayUtc }, select: { id: true } }),
    prisma.quest.count({ where: { userId, status: 'DONE', completedAt: { gte: startOfDay } } }),
  ])

  const addictionDays =
    addictions.length > 0
      ? Math.max(
          ...addictions.map((a) => Math.floor((now.getTime() - a.startDate.getTime()) / DAY_MS)),
        )
      : null

  const summary: DashboardSummary = {
    quote,
    deepWorkTodaySeconds: deepWork._sum.duration ?? 0,
    addictionDays,
    journalWrittenToday: Boolean(journal),
    questsDoneToday,
  }
  res.json(summary)
})
