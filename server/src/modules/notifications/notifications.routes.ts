import type { NotificationDto, NotificationsResponse } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'

/**
 * Notifications produit (demandes d'amis reçues / acceptées / refusées…).
 * Les lignes sont créées par les modules métier ; ces routes alimentent le
 * futur centre de notifications du client.
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

notificationsRouter.post('/read-all', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: getUserId(req), readAt: null },
    data: { readAt: new Date() },
  })
  res.status(204).end()
})
