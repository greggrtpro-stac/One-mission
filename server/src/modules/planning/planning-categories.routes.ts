import type { Request, Response } from 'express'
import { Router } from 'express'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import * as categories from './planning-categories.service.js'
import {
  createCategorySchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from './planning-categories.schemas.js'

export const planningCategoriesRouter = Router()
planningCategoriesRouter.use(requireAuth)

planningCategoriesRouter.get('/', async (req: Request, res: Response) => {
  const list = await categories.listCategories(getUserId(req))
  res.json({ categories: list })
})

planningCategoriesRouter.post(
  '/',
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    const category = await categories.createCategory(getUserId(req), req.body)
    res.status(201).json({ category })
  },
)

planningCategoriesRouter.put(
  '/reorder',
  validateBody(reorderCategoriesSchema),
  async (req: Request, res: Response) => {
    await categories.reorderCategories(getUserId(req), req.body.ids)
    res.status(204).end()
  },
)

planningCategoriesRouter.patch(
  '/:id',
  validateBody(updateCategorySchema),
  async (req: Request, res: Response) => {
    const category = await categories.updateCategory(
      getUserId(req),
      req.params.id as string,
      req.body,
    )
    res.json({ category })
  },
)

planningCategoriesRouter.delete(
  '/:id',
  validateBody(deleteCategorySchema),
  async (req: Request, res: Response) => {
    await categories.deleteCategory(getUserId(req), req.params.id as string, req.body)
    res.status(204).end()
  },
)
