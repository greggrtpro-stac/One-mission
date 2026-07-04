import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { validateBody } from '../../middleware/validate.js'
import { toMainQuestDto } from '../quests/quests.mapper.js'
import { patchMainQuestSchema, upsertMainQuestSchema } from '../quests/quests.schemas.js'

export const mainQuestRouter = Router()
mainQuestRouter.use(requireAuth)

mainQuestRouter.get('/', async (req: Request, res: Response) => {
  const mq = await prisma.mainQuest.findUnique({ where: { userId: getUserId(req) } })
  res.json({ mainQuest: mq ? toMainQuestDto(mq) : null })
})

/** Crée ou remplace la quête principale (une seule par joueur). */
mainQuestRouter.put('/', validateBody(upsertMainQuestSchema), async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const { title, description, targetDate, progress, milestones } = req.body

  const data = {
    title,
    description: description ?? null,
    targetDate: targetDate ? new Date(targetDate) : null,
    progress,
    milestones,
  }
  const mq = await prisma.mainQuest.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
  res.json({ mainQuest: toMainQuestDto(mq) })
})

/** Mise à jour partielle (progression, jalons cochés…). */
mainQuestRouter.patch('/', validateBody(patchMainQuestSchema), async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const existing = await prisma.mainQuest.findUnique({ where: { userId } })
  if (!existing) throw new ApiError(404, 'Aucune quête principale définie')

  const { title, description, targetDate, progress, milestones } = req.body
  const mq = await prisma.mainQuest.update({
    where: { userId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      ...(progress !== undefined && { progress }),
      ...(milestones !== undefined && { milestones }),
    },
  })
  res.json({ mainQuest: toMainQuestDto(mq) })
})

mainQuestRouter.delete('/', async (req: Request, res: Response) => {
  await prisma.mainQuest.deleteMany({ where: { userId: getUserId(req) } })
  res.status(204).end()
})
