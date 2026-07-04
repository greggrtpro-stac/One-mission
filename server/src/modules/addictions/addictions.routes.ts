import type { AddictionDto } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import type { Addiction, Relapse } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { validateBody } from '../../middleware/validate.js'

const DAY_MS = 24 * 60 * 60 * 1000

const createSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(60),
  icon: z.string().max(16).nullable().optional(),
  /** Date de début de l'abstinence (YYYY-MM-DD), aujourd'hui par défaut. */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const updateSchema = createSchema.partial()

const relapseSchema = z.object({
  note: z.string().max(500).nullable().optional(),
})

type AddictionWithRelapses = Addiction & { relapses: Relapse[] }

function toDto(a: AddictionWithRelapses): AddictionDto {
  return {
    id: a.id,
    name: a.name,
    icon: a.icon,
    startDate: a.startDate.toISOString(),
    relapseCount: a.relapseCount,
    bestStreak: a.bestStreak,
    createdAt: a.createdAt.toISOString(),
    relapses: a.relapses.map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt.toISOString(),
      streakLost: r.streakLost,
      note: r.note,
    })),
  }
}

const withRelapses = {
  relapses: { orderBy: { occurredAt: 'asc' as const }, take: 100 },
}

async function getOwned(userId: string, id: string): Promise<AddictionWithRelapses> {
  const addiction = await prisma.addiction.findFirst({
    where: { id, userId },
    include: withRelapses,
  })
  if (!addiction) throw new ApiError(404, 'Addiction introuvable')
  return addiction
}

export const addictionsRouter = Router()
addictionsRouter.use(requireAuth)

addictionsRouter.get('/', async (req: Request, res: Response) => {
  const list = await prisma.addiction.findMany({
    where: { userId: getUserId(req) },
    orderBy: { createdAt: 'asc' },
    include: withRelapses,
  })
  res.json({ addictions: list.map(toDto) })
})

addictionsRouter.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date()
  const addiction = await prisma.addiction.create({
    data: {
      userId: getUserId(req),
      name: req.body.name,
      icon: req.body.icon ?? null,
      startDate,
    },
    include: withRelapses,
  })
  res.status(201).json({ addiction: toDto(addiction) })
})

addictionsRouter.patch('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const owned = await getOwned(getUserId(req), req.params.id as string)
  const addiction = await prisma.addiction.update({
    where: { id: owned.id },
    data: {
      ...(req.body.name !== undefined && { name: req.body.name }),
      ...(req.body.icon !== undefined && { icon: req.body.icon }),
      ...(req.body.startDate !== undefined && { startDate: new Date(req.body.startDate) }),
    },
    include: withRelapses,
  })
  res.json({ addiction: toDto(addiction) })
})

addictionsRouter.delete('/:id', async (req: Request, res: Response) => {
  const owned = await getOwned(getUserId(req), req.params.id as string)
  await prisma.addiction.delete({ where: { id: owned.id } })
  res.status(204).end()
})

/** « J'ai rechuté » : archive la série perdue, met à jour le record, repart à zéro. */
addictionsRouter.post(
  '/:id/relapse',
  validateBody(relapseSchema),
  async (req: Request, res: Response) => {
    const owned = await getOwned(getUserId(req), req.params.id as string)
    const now = new Date()
    const streakLost = Math.max(0, Math.floor((now.getTime() - owned.startDate.getTime()) / DAY_MS))

    const [, addiction] = await prisma.$transaction([
      prisma.relapse.create({
        data: {
          addictionId: owned.id,
          occurredAt: now,
          streakLost,
          note: req.body.note ?? null,
        },
      }),
      prisma.addiction.update({
        where: { id: owned.id },
        data: {
          startDate: now,
          relapseCount: { increment: 1 },
          bestStreak: Math.max(owned.bestStreak, streakLost),
        },
        include: withRelapses,
      }),
    ])
    res.json({ addiction: toDto(addiction) })
  },
)
