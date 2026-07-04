import {
  DEFAULT_DEEPWORK_SETTINGS,
  deepworkSessionXp,
  type DeepWorkSessionDto,
  type DeepWorkSettings,
  type DeepWorkStats,
  type XpResult,
} from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import type { DeepWorkSession } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { currentWeekStart } from '../../utils/week.js'
import { awardXp } from '../gamification/gamification.service.js'

const createSessionSchema = z.object({
  startedAt: z.iso.datetime(),
  duration: z.number().int().min(10).max(12 * 3600),
  kind: z.enum(['FOCUS', 'SHORT_BREAK', 'LONG_BREAK']).default('FOCUS'),
  completed: z.boolean().default(true),
})

const settingsSchema = z.object({
  focusMinutes: z.number().int().min(5).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(5).max(120),
  cyclesBeforeLongBreak: z.number().int().min(2).max(12),
})

function toSessionDto(s: DeepWorkSession): DeepWorkSessionDto {
  return {
    id: s.id,
    startedAt: s.startedAt.toISOString(),
    duration: s.duration,
    kind: s.kind,
    completed: s.completed,
  }
}

function parseSettings(raw: unknown): DeepWorkSettings {
  const parsed = settingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_DEEPWORK_SETTINGS
}

export const deepworkRouter = Router()
deepworkRouter.use(requireAuth)

deepworkRouter.post(
  '/sessions',
  validateBody(createSessionSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(req)
    const session = await prisma.deepWorkSession.create({
      data: {
        userId,
        startedAt: new Date(req.body.startedAt),
        duration: req.body.duration,
        kind: req.body.kind,
        completed: req.body.completed,
      },
    })

    // Seul un focus mené à son terme rapporte de l'XP (1 XP/min, plafonné).
    let xp: XpResult | null = null
    if (session.kind === 'FOCUS' && session.completed) {
      const amount = deepworkSessionXp(session.duration)
      if (amount > 0) xp = await awardXp(userId, amount)
    }

    res.status(201).json({ session: toSessionDto(session), xp })
  },
)

deepworkRouter.get('/sessions', async (req: Request, res: Response) => {
  const sessions = await prisma.deepWorkSession.findMany({
    where: { userId: getUserId(req) },
    orderBy: { startedAt: 'desc' },
    take: 30,
  })
  res.json({ sessions: sessions.map(toSessionDto) })
})

deepworkRouter.get('/stats', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = currentWeekStart(now)

  const focus = { userId, kind: 'FOCUS' as const }
  const [today, week, month, total, count, user] = await Promise.all([
    prisma.deepWorkSession.aggregate({
      where: { ...focus, startedAt: { gte: startOfDay } },
      _sum: { duration: true },
    }),
    prisma.deepWorkSession.aggregate({
      where: { ...focus, startedAt: { gte: weekStart } },
      _sum: { duration: true },
    }),
    prisma.deepWorkSession.aggregate({
      where: { ...focus, startedAt: { gte: startOfMonth } },
      _sum: { duration: true },
    }),
    prisma.deepWorkSession.aggregate({ where: focus, _sum: { duration: true } }),
    prisma.deepWorkSession.count({ where: focus }),
    prisma.user.findUnique({ where: { id: userId }, select: { deepWorkSettings: true } }),
  ])

  const stats: DeepWorkStats = {
    todaySeconds: today._sum.duration ?? 0,
    weekSeconds: week._sum.duration ?? 0,
    monthSeconds: month._sum.duration ?? 0,
    totalSeconds: total._sum.duration ?? 0,
    sessionsCount: count,
    settings: parseSettings(user?.deepWorkSettings),
  }
  res.json(stats)
})

deepworkRouter.put('/settings', validateBody(settingsSchema), async (req: Request, res: Response) => {
  await prisma.user.update({
    where: { id: getUserId(req) },
    data: { deepWorkSettings: req.body },
  })
  res.json({ settings: req.body as DeepWorkSettings })
})
