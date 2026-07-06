import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { difficultyEnum } from '../quests/quests.schemas.js'
import * as weekly from './weekly.service.js'

const createSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(120),
  description: z.string().max(2000).nullable().optional(),
  difficulty: difficultyEnum.default('MEDIUM'),
})

const updateSchema = createSchema.partial()

const reorderSchema = z.object({
  ids: z.array(z.string()).max(200),
})

export const weeklyRouter = Router()
weeklyRouter.use(requireAuth)

weeklyRouter.get('/', async (req: Request, res: Response) => {
  const list = await weekly.listWeekly(getUserId(req))
  res.json({ weeklyQuests: list.map(weekly.toWeeklyDto) })
})

weeklyRouter.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const wq = await weekly.createWeekly(getUserId(req), req.body)
  res.status(201).json({ weeklyQuest: weekly.toWeeklyDto(wq) })
})

weeklyRouter.post('/reset', async (req: Request, res: Response) => {
  const list = await weekly.resetWeek(getUserId(req))
  res.json({ weeklyQuests: list.map(weekly.toWeeklyDto) })
})

weeklyRouter.put('/reorder', validateBody(reorderSchema), async (req: Request, res: Response) => {
  await weekly.reorderWeekly(getUserId(req), req.body.ids)
  res.status(204).end()
})

weeklyRouter.patch('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const wq = await weekly.updateWeekly(getUserId(req), req.params.id as string, req.body)
  res.json({ weeklyQuest: weekly.toWeeklyDto(wq) })
})

weeklyRouter.delete('/:id', async (req: Request, res: Response) => {
  await weekly.deleteWeekly(getUserId(req), req.params.id as string)
  res.status(204).end()
})

weeklyRouter.post('/:id/complete', async (req: Request, res: Response) => {
  res.json(await weekly.completeWeekly(getUserId(req), req.params.id as string))
})

weeklyRouter.post('/:id/uncomplete', async (req: Request, res: Response) => {
  res.json(await weekly.uncompleteWeekly(getUserId(req), req.params.id as string))
})
