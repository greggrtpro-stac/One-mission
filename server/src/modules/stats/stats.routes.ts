import type { DailyStat, StatsOverview } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 30

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const statsRouter = Router()
statsRouter.use(requireAuth)

statsRouter.get('/overview', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const now = new Date()
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (WINDOW_DAYS - 1),
  )

  const [quests, sessions, categories, totalsRaw] = await Promise.all([
    prisma.quest.findMany({
      where: { userId, status: 'DONE', completedAt: { gte: windowStart } },
      select: { completedAt: true, xpAwarded: true },
    }),
    prisma.deepWorkSession.findMany({
      where: { userId, kind: 'FOCUS', startedAt: { gte: windowStart } },
      select: { startedAt: true, duration: true },
    }),
    prisma.quest.groupBy({
      by: ['category'],
      where: { userId, status: 'DONE' },
      _count: { _all: true },
    }),
    Promise.all([
      prisma.quest.count({ where: { userId, status: 'DONE' } }),
      prisma.weeklyQuest.aggregate({ where: { userId }, _sum: { totalCompletions: true } }),
      prisma.deepWorkSession.aggregate({
        where: { userId, kind: 'FOCUS' },
        _sum: { duration: true },
        _count: { _all: true },
      }),
      prisma.journalEntry.count({ where: { userId } }),
      prisma.addiction.findMany({ where: { userId }, select: { startDate: true } }),
    ]),
  ])

  // Un point par jour sur la fenêtre, même vide (les graphiques ont besoin du zéro).
  const days: DailyStat[] = []
  const index = new Map<string, DailyStat>()
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const d = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate() + i)
    const stat: DailyStat = { date: localDayKey(d), questsDone: 0, xpFromQuests: 0, focusSeconds: 0 }
    days.push(stat)
    index.set(stat.date, stat)
  }
  for (const q of quests) {
    const stat = q.completedAt && index.get(localDayKey(q.completedAt))
    if (stat) {
      stat.questsDone += 1
      stat.xpFromQuests += q.xpAwarded
    }
  }
  for (const s of sessions) {
    const stat = index.get(localDayKey(s.startedAt))
    if (stat) stat.focusSeconds += s.duration
  }

  const [questsDone, weekly, deepwork, journalEntries, addictions] = totalsRaw
  const overview: StatsOverview = {
    days,
    categories: categories
      .map((c) => ({ category: c.category, count: c._count._all }))
      .sort((a, b) => b.count - a.count),
    totals: {
      questsDone,
      weeklyCompletions: weekly._sum.totalCompletions ?? 0,
      focusSeconds: deepwork._sum.duration ?? 0,
      deepworkSessions: deepwork._count._all,
      journalEntries,
      relapsesAvoidedDays: addictions.reduce(
        (sum, a) => sum + Math.max(0, Math.floor((now.getTime() - a.startDate.getTime()) / DAY_MS)),
        0,
      ),
    },
  }
  res.json(overview)
})
