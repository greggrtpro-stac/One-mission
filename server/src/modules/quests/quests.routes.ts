import type { Request, Response } from 'express'
import { Router } from 'express'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { toQuestDto } from './quests.mapper.js'
import { createQuestSchema, updateQuestSchema } from './quests.schemas.js'
import * as quests from './quests.service.js'

export const questsRouter = Router()
questsRouter.use(requireAuth)

questsRouter.get('/', async (req: Request, res: Response) => {
  const list = await quests.listQuests(getUserId(req))
  res.json({ quests: list.map(toQuestDto) })
})

questsRouter.post('/', validateBody(createQuestSchema), async (req: Request, res: Response) => {
  const quest = await quests.createQuest(getUserId(req), req.body)
  res.status(201).json({ quest: toQuestDto(quest) })
})

questsRouter.patch('/:id', validateBody(updateQuestSchema), async (req: Request, res: Response) => {
  const result = await quests.updateQuest(getUserId(req), req.params.id as string, req.body)
  res.json(result)
})

questsRouter.post('/:id/complete', async (req: Request, res: Response) => {
  const result = await quests.completeQuest(getUserId(req), req.params.id as string)
  res.json(result)
})

questsRouter.post('/:id/uncomplete', async (req: Request, res: Response) => {
  const result = await quests.uncompleteQuest(getUserId(req), req.params.id as string)
  res.json(result)
})

questsRouter.delete('/:id', async (req: Request, res: Response) => {
  const result = await quests.deleteQuest(getUserId(req), req.params.id as string)
  res.json(result)
})
