import {
  deepworkSessionXp,
  JOURNAL_ENTRY_XP,
  type ProfileDay,
  type ProfileStats,
  type ProfileWeek,
} from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'

const DAY_MS = 24 * 60 * 60 * 1000
const DAYS_WINDOW = 30
const WEEKS_WINDOW = 12

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Lundi 00:00 (heure locale) de la semaine du jour donné. */
function mondayOf(d: Date): Date {
  const day = d.getDay() // 0 = dimanche
  const diff = day === 0 ? 6 : day - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}

export const statsRouter = Router()
statsRouter.use(requireAuth)

/** Toutes les données de la page Profil : stats globales, séries et graphiques. */
statsRouter.get('/profile', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const now = new Date()
  const daysStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS_WINDOW - 1))
  const currentMonday = mondayOf(now)
  const weeksStart = new Date(
    currentMonday.getFullYear(),
    currentMonday.getMonth(),
    currentMonday.getDate() - (WEEKS_WINDOW - 1) * 7,
  )

  const me = await prisma.user.findUnique({ where: { id: userId } })
  if (!me) throw new ApiError(404, 'Utilisateur introuvable')

  const [
    ahead,
    totalPlayers,
    questsCreated,
    questsDone,
    mainQuest,
    weekly,
    deepwork,
    journalEntries,
    addictions,
    categories,
    doneQuests,
    sessions,
    journalRecent,
    relapsesRecent,
  ] = await Promise.all([
    // Rang : même tri et même filtre de visibilité que le classement.
    prisma.user.count({
      where: {
        showOnLeaderboard: true,
        id: { not: userId },
        OR: [
          { totalXp: { gt: me.totalXp } },
          { totalXp: me.totalXp, createdAt: { lt: me.createdAt } },
        ],
      },
    }),
    prisma.user.count({ where: { showOnLeaderboard: true } }),
    prisma.quest.count({ where: { userId } }),
    prisma.quest.count({ where: { userId, status: 'DONE' } }),
    prisma.mainQuest.findUnique({ where: { userId }, select: { progress: true } }),
    prisma.weeklyQuest.aggregate({ where: { userId }, _sum: { totalCompletions: true } }),
    prisma.deepWorkSession.aggregate({
      where: { userId, kind: 'FOCUS' },
      _sum: { duration: true },
      _count: { _all: true },
    }),
    prisma.journalEntry.count({ where: { userId } }),
    prisma.addiction.findMany({
      where: { userId },
      select: { name: true, icon: true, startDate: true, bestStreak: true, relapseCount: true },
    }),
    prisma.quest.groupBy({
      by: ['category'],
      where: { userId, status: 'DONE' },
      _count: { _all: true },
    }),
    // Fenêtre de 12 semaines : sert aussi aux 30 jours (inclus dedans).
    prisma.quest.findMany({
      where: { userId, status: 'DONE', completedAt: { gte: weeksStart } },
      select: { completedAt: true, xpAwarded: true },
    }),
    prisma.deepWorkSession.findMany({
      where: { userId, kind: 'FOCUS', startedAt: { gte: daysStart } },
      select: { startedAt: true, duration: true },
    }),
    prisma.journalEntry.findMany({
      where: { userId, createdAt: { gte: daysStart } },
      select: { createdAt: true },
    }),
    prisma.relapse.findMany({
      where: { addiction: { userId }, occurredAt: { gte: daysStart } },
      select: { occurredAt: true },
    }),
  ])

  // ── 30 derniers jours : un point par jour, même vide ───────
  const days: ProfileDay[] = []
  const dayIndex = new Map<string, ProfileDay>()
  for (let i = 0; i < DAYS_WINDOW; i++) {
    const d = new Date(daysStart.getFullYear(), daysStart.getMonth(), daysStart.getDate() + i)
    const stat: ProfileDay = {
      date: localDayKey(d),
      questsDone: 0,
      xpGained: 0,
      focusSeconds: 0,
      relapses: 0,
    }
    days.push(stat)
    dayIndex.set(stat.date, stat)
  }
  for (const q of doneQuests) {
    const stat = q.completedAt && dayIndex.get(localDayKey(q.completedAt))
    if (stat) {
      stat.questsDone += 1
      stat.xpGained += q.xpAwarded
    }
  }
  for (const s of sessions) {
    const stat = dayIndex.get(localDayKey(s.startedAt))
    if (stat) {
      stat.focusSeconds += s.duration
      stat.xpGained += deepworkSessionXp(s.duration)
    }
  }
  for (const j of journalRecent) {
    const stat = dayIndex.get(localDayKey(j.createdAt))
    if (stat) stat.xpGained += JOURNAL_ENTRY_XP
  }
  for (const r of relapsesRecent) {
    const stat = dayIndex.get(localDayKey(r.occurredAt))
    if (stat) stat.relapses += 1
  }

  // ── 12 dernières semaines : quêtes terminées par semaine ───
  const weeks: ProfileWeek[] = []
  const weekIndex = new Map<string, ProfileWeek>()
  for (let i = 0; i < WEEKS_WINDOW; i++) {
    const monday = new Date(
      weeksStart.getFullYear(),
      weeksStart.getMonth(),
      weeksStart.getDate() + i * 7,
    )
    const stat: ProfileWeek = { weekStart: localDayKey(monday), questsDone: 0 }
    weeks.push(stat)
    weekIndex.set(stat.weekStart, stat)
  }
  for (const q of doneQuests) {
    if (!q.completedAt) continue
    const stat = weekIndex.get(localDayKey(mondayOf(q.completedAt)))
    if (stat) stat.questsDone += 1
  }

  // ── Addictions : série en cours et records ──────────────────
  const addictionStats = addictions.map((a) => {
    const currentDays = Math.max(0, Math.floor((now.getTime() - a.startDate.getTime()) / DAY_MS))
    return {
      name: a.name,
      icon: a.icon,
      currentDays,
      bestDays: Math.max(a.bestStreak, currentDays),
      relapseCount: a.relapseCount,
    }
  })

  const focusSeconds = deepwork._sum.duration ?? 0
  const daysSinceCreation = Math.max(
    1,
    Math.ceil((now.getTime() - me.createdAt.getTime()) / DAY_MS),
  )

  const stats: ProfileStats = {
    rank: ahead + 1,
    totalPlayers: Math.max(totalPlayers, ahead + 1),

    questsCreated,
    questsDone,
    successRate: questsCreated > 0 ? Math.round((questsDone / questsCreated) * 100) : 0,
    mainQuestsDone: mainQuest && mainQuest.progress >= 100 ? 1 : 0,
    weeklyCompletions: weekly._sum.totalCompletions ?? 0,

    focusSeconds,
    focusAvgSecondsPerDay: Math.round(focusSeconds / daysSinceCreation),
    deepworkSessions: deepwork._count._all,
    journalEntries,

    addictionsCount: addictions.length,
    relapsesTotal: addictions.reduce((sum, a) => sum + a.relapseCount, 0),
    longestCleanDays: addictionStats.reduce((max, a) => Math.max(max, a.bestDays), 0),

    days,
    weeks,
    addictions: addictionStats,
    categories: categories
      .map((c) => ({ category: c.category, count: c._count._all }))
      .sort((a, b) => b.count - a.count),
  }
  res.json(stats)
})
