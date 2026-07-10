import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { computeProfileStats } from './stats.service.js'

export const statsRouter = Router()
statsRouter.use(requireAuth)

/** Toutes les données de la page Profil : stats globales, séries et graphiques. */
statsRouter.get('/profile', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totalXp: true, createdAt: true },
  })
  if (!me) throw new ApiError(404, 'Utilisateur introuvable')

  res.json(await computeProfileStats(me))
})
