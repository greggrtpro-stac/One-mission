import type { NotificationDto, NotificationsResponse } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'

/**
 * Notifications produit (demandes d'amis reçues / acceptées / refusées,
 * événements de guilde…). Les lignes sont créées par les modules métier ;
 * ces routes alimentent le centre de notifications du client (cloche du header).
 */
export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ])

  const notifications: NotificationDto[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    data: (row.data ?? null) as NotificationDto['data'],
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }))
  const response: NotificationsResponse = { notifications, unreadCount }
  res.json(response)
})

/** Marque une notification précise comme lue (no-op si déjà lue, inexistante, ou d'un autre compte). */
notificationsRouter.post('/:id/read', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id as string, userId: getUserId(req), readAt: null },
    data: { readAt: new Date() },
  })
  res.status(204).end()
})

notificationsRouter.post('/read-all', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: getUserId(req), readAt: null },
    data: { readAt: new Date() },
  })
  res.status(204).end()
})
