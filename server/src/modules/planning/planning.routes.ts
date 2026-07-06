import type { Request, Response } from 'express'
import { Router } from 'express'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { validateBody } from '../../middleware/validate.js'
import { toPlanningEventDto } from './planning.mapper.js'
import {
  convertToQuestSchema,
  createEventSchema,
  rangeQuerySchema,
  updateEventSchema,
} from './planning.schemas.js'
import * as planning from './planning.service.js'

export const planningRouter = Router()
planningRouter.use(requireAuth)

/** Plage demandée en query (?from=ISO&to=ISO), bornée à 1 an pour éviter les abus. */
function parseRange(req: Request): { from: Date; to: Date } {
  const parsed = rangeQuerySchema.safeParse(req.query)
  if (!parsed.success) throw new ApiError(400, 'Paramètres from/to attendus (ISO 8601)')
  const from = new Date(parsed.data.from)
  const to = new Date(parsed.data.to)
  if (to <= from || to.getTime() - from.getTime() > 366 * 24 * 3600 * 1000) {
    throw new ApiError(400, 'Plage invalide')
  }
  return { from, to }
}

planningRouter.get('/', async (req: Request, res: Response) => {
  const { from, to } = parseRange(req)
  const events = await planning.listEvents(getUserId(req), from, to)
  res.json({ events: events.map(toPlanningEventDto) })
})

planningRouter.get('/stats', async (req: Request, res: Response) => {
  const { from, to } = parseRange(req)
  const stats = await planning.getStats(getUserId(req), from, to)
  res.json({ stats })
})

planningRouter.post('/', validateBody(createEventSchema), async (req: Request, res: Response) => {
  const event = await planning.createEvent(getUserId(req), req.body)
  res.status(201).json({ event: toPlanningEventDto(event) })
})

planningRouter.patch(
  '/:id',
  validateBody(updateEventSchema),
  async (req: Request, res: Response) => {
    const event = await planning.updateEvent(getUserId(req), req.params.id as string, req.body)
    res.json({ event: toPlanningEventDto(event) })
  },
)

planningRouter.delete('/:id', async (req: Request, res: Response) => {
  await planning.deleteEvent(getUserId(req), req.params.id as string)
  res.status(204).end()
})

planningRouter.post('/:id/complete', async (req: Request, res: Response) => {
  const result = await planning.completeEvent(getUserId(req), req.params.id as string)
  res.json(result)
})

planningRouter.post('/:id/uncomplete', async (req: Request, res: Response) => {
  const result = await planning.uncompleteEvent(getUserId(req), req.params.id as string)
  res.json(result)
})

planningRouter.post(
  '/:id/convert-to-quest',
  validateBody(convertToQuestSchema),
  async (req: Request, res: Response) => {
    const event = await planning.convertToQuest(getUserId(req), req.params.id as string, req.body)
    res.json({ event: toPlanningEventDto(event) })
  },
)
