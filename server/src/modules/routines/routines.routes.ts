import type { Request, Response } from 'express'
import { Router } from 'express'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import {
  createTaskSchema,
  dayActionSchema,
  reorderTasksSchema,
  updateTaskSchema,
} from './routines.schemas.js'
import * as routines from './routines.service.js'

export const routinesRouter = Router()
routinesRouter.use(requireAuth)

routinesRouter.get('/', async (req: Request, res: Response) => {
  res.json(await routines.getOverview(getUserId(req)))
})

routinesRouter.post(
  '/sections/:sectionId/tasks',
  validateBody(createTaskSchema),
  async (req: Request, res: Response) => {
    const task = await routines.createTask(
      getUserId(req),
      req.params.sectionId as string,
      req.body.title,
    )
    res.status(201).json({ id: task.id, title: task.title, sortOrder: task.sortOrder })
  },
)

routinesRouter.patch(
  '/tasks/:taskId',
  validateBody(updateTaskSchema),
  async (req: Request, res: Response) => {
    const task = await routines.updateTask(getUserId(req), req.params.taskId as string, req.body.title)
    res.json({ id: task.id, title: task.title, sortOrder: task.sortOrder })
  },
)

routinesRouter.delete('/tasks/:taskId', async (req: Request, res: Response) => {
  await routines.deleteTask(getUserId(req), req.params.taskId as string)
  res.status(204).end()
})

routinesRouter.put(
  '/sections/:sectionId/tasks/reorder',
  validateBody(reorderTasksSchema),
  async (req: Request, res: Response) => {
    await routines.reorderTasks(getUserId(req), req.params.sectionId as string, req.body.ids)
    res.status(204).end()
  },
)

routinesRouter.post(
  '/tasks/:taskId/check',
  validateBody(dayActionSchema),
  async (req: Request, res: Response) => {
    await routines.checkDay(getUserId(req), req.params.taskId as string, req.body.day)
    res.status(204).end()
  },
)

routinesRouter.post(
  '/tasks/:taskId/uncheck',
  validateBody(dayActionSchema),
  async (req: Request, res: Response) => {
    await routines.uncheckDay(getUserId(req), req.params.taskId as string, req.body.day)
    res.status(204).end()
  },
)

/** Réinitialisation manuelle demandée par l'utilisateur (avec confirmation côté client). */
routinesRouter.post('/reset', async (req: Request, res: Response) => {
  await routines.resetCurrentWeek(getUserId(req))
  res.json(await routines.getOverview(getUserId(req)))
})
