import type {
  FriendRequestsResponse,
  FriendSearchResponse,
  FriendsListResponse,
} from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import * as friends from './friends.service.js'

const sendRequestSchema = z.object({
  /** Id du joueur cible (obtenu via la recherche — jamais un pseudo brut ici). */
  userId: z.string().min(1),
})

export const friendsRouter = Router()
friendsRouter.use(requireAuth)

/** Liste d'amis, avec statut en ligne et dernière connexion selon leurs préférences. */
friendsRouter.get('/', async (req: Request, res: Response) => {
  const response: FriendsListResponse = { friends: await friends.listFriends(getUserId(req)) }
  res.json(response)
})

/**
 * Recherche par pseudo (exact ou partiel, insensible à la casse).
 * Moins de 2 caractères : liste vide, pour ne pas énumérer tous les joueurs.
 */
friendsRouter.get('/search', async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim()
  const response: FriendSearchResponse = {
    results: q.length >= 2 ? await friends.searchPlayers(getUserId(req), q) : [],
  }
  res.json(response)
})

friendsRouter.get('/requests', async (req: Request, res: Response) => {
  const response: FriendRequestsResponse = await friends.listRequests(getUserId(req))
  res.json(response)
})

friendsRouter.post(
  '/requests',
  validateBody(sendRequestSchema),
  async (req: Request, res: Response) => {
    const result = await friends.sendRequest(getUserId(req), req.body.userId as string)
    res.status(201).json(result)
  },
)

friendsRouter.post('/requests/:id/accept', async (req: Request, res: Response) => {
  await friends.acceptRequest(getUserId(req), req.params.id as string)
  res.status(204).end()
})

friendsRouter.post('/requests/:id/decline', async (req: Request, res: Response) => {
  await friends.declineRequest(getUserId(req), req.params.id as string)
  res.status(204).end()
})

friendsRouter.delete('/requests/:id', async (req: Request, res: Response) => {
  await friends.cancelRequest(getUserId(req), req.params.id as string)
  res.status(204).end()
})

// Après /requests/* pour que « requests » ne soit jamais interprété comme un userId.
friendsRouter.delete('/:userId', async (req: Request, res: Response) => {
  await friends.removeFriend(getUserId(req), req.params.userId as string)
  res.status(204).end()
})
