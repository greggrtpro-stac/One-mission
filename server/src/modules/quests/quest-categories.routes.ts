import type { Request, Response } from 'express'
import { Router } from 'express'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import * as categories from './quest-categories.service.js'
import {
  createQuestCategorySchema,
  deleteQuestCategorySchema,
  reorderQuestCategoriesSchema,
  updateQuestCategorySchema,
} from './quest-categories.schemas.js'

export const questCategoriesRouter = Router()
questCategoriesRouter.use(requireAuth)

questCategoriesRouter.get('/', async (req: Request, res: Response) => {
  const list = await categories.listCategories(getUserId(req))
  res.json({ categories: list })
})

questCategoriesRouter.post(
  '/',
  validateBody(createQuestCategorySchema),
  async (req: Request, res: Response) => {
    const category = await categories.createCategory(getUserId(req), req.body)
    res.status(201).json({ category })
  },
)

questCategoriesRouter.put(
  '/reorder',
  validateBody(reorderQuestCategoriesSchema),
  async (req: Request, res: Response) => {
    await categories.reorderCategories(getUserId(req), req.body.ids)
    res.status(204).end()
  },
)

questCategoriesRouter.patch(
  '/:id',
  validateBody(updateQuestCategorySchema),
  async (req: Request, res: Response) => {
    const category = await categories.updateCategory(
      getUserId(req),
      req.params.id as string,
      req.body,
    )
    res.json({ category })
  },
)

questCategoriesRouter.delete(
  '/:id',
  validateBody(deleteQuestCategorySchema),
  async (req: Request, res: Response) => {
    const result = await categories.deleteCategory(getUserId(req), req.params.id as string, req.body)
    res.json(result)
  },
)
