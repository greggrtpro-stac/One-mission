import type {
  GuildInvitationsResponse,
  GuildLeaderboardResponse,
  GuildResponse,
  GuildSearchResponse,
} from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import * as chat from './guild-chat.service.js'
import * as membership from './guild-membership.service.js'
import * as guilds from './guilds.service.js'
import {
  createGuildSchema,
  inviteSchema,
  joinRequestSchema,
  postMessageSchema,
  transferSchema,
  updateGuildSchema,
} from './guilds.schemas.js'

export const guildsRouter = Router()
guildsRouter.use(requireAuth)

// ── Classement, recherche, création ──────────────────────────
// Les routes fixes précèdent /:id pour ne jamais être interprétées comme un id.

/** Classement des guildes, trié par Score global. */
guildsRouter.get('/', async (req: Request, res: Response) => {
  const response: GuildLeaderboardResponse = await guilds.getLeaderboard(getUserId(req))
  res.json(response)
})

guildsRouter.get('/search', async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '')
  const response: GuildSearchResponse = {
    results: await guilds.searchGuilds(getUserId(req), q),
  }
  res.json(response)
})

guildsRouter.post('/', validateBody(createGuildSchema), async (req: Request, res: Response) => {
  const guild = await guilds.createGuild(getUserId(req), req.body)
  const response: GuildResponse = { guild }
  res.status(201).json(response)
})

// ── Ma guilde ────────────────────────────────────────────────

guildsRouter.get('/me', async (req: Request, res: Response) => {
  res.json(await guilds.getMyGuild(getUserId(req)))
})

guildsRouter.post('/me/leave', async (req: Request, res: Response) => {
  await membership.leaveGuild(getUserId(req))
  res.status(204).end()
})

// ── Mes invitations ──────────────────────────────────────────

guildsRouter.get('/invitations', async (req: Request, res: Response) => {
  const response: GuildInvitationsResponse = {
    invitations: await membership.listMyInvitations(getUserId(req)),
  }
  res.json(response)
})

guildsRouter.post('/invitations/:id/accept', async (req: Request, res: Response) => {
  await membership.acceptInvitation(getUserId(req), req.params.id as string)
  res.status(204).end()
})

guildsRouter.post('/invitations/:id/decline', async (req: Request, res: Response) => {
  await membership.declineInvitation(getUserId(req), req.params.id as string)
  res.status(204).end()
})

// ── Demandes d'adhésion (les ids de demande portent leur guilde) ──

guildsRouter.post('/requests/:id/accept', async (req: Request, res: Response) => {
  await membership.acceptJoinRequest(getUserId(req), req.params.id as string)
  res.status(204).end()
})

guildsRouter.post('/requests/:id/decline', async (req: Request, res: Response) => {
  await membership.declineJoinRequest(getUserId(req), req.params.id as string)
  res.status(204).end()
})

guildsRouter.delete('/requests/:id', async (req: Request, res: Response) => {
  await membership.cancelJoinRequest(getUserId(req), req.params.id as string)
  res.status(204).end()
})

// ── Fiche, modification, suppression ─────────────────────────

guildsRouter.get('/:id', async (req: Request, res: Response) => {
  const response: GuildResponse = {
    guild: await guilds.getGuild(getUserId(req), req.params.id as string),
  }
  res.json(response)
})

guildsRouter.patch(
  '/:id',
  validateBody(updateGuildSchema),
  async (req: Request, res: Response) => {
    const response: GuildResponse = {
      guild: await guilds.updateGuild(getUserId(req), req.params.id as string, req.body),
    }
    res.json(response)
  },
)

guildsRouter.delete('/:id', async (req: Request, res: Response) => {
  await guilds.deleteGuild(getUserId(req), req.params.id as string)
  res.status(204).end()
})

// ── Rejoindre / inviter / gérer les membres ──────────────────

guildsRouter.post(
  '/:id/join',
  validateBody(joinRequestSchema),
  async (req: Request, res: Response) => {
    const result = await membership.joinGuild(
      getUserId(req),
      req.params.id as string,
      req.body.message as string | undefined,
    )
    res.status(201).json(result)
  },
)

guildsRouter.get('/:id/invitable', async (req: Request, res: Response) => {
  const results = await membership.searchInvitablePlayers(
    getUserId(req),
    req.params.id as string,
    String(req.query.q ?? ''),
  )
  res.json({ results })
})

guildsRouter.post(
  '/:id/invitations',
  validateBody(inviteSchema),
  async (req: Request, res: Response) => {
    await membership.invitePlayer(getUserId(req), req.params.id as string, req.body.userId as string)
    res.status(201).json({ status: 'invited' })
  },
)

guildsRouter.post('/:id/members/:userId/promote', async (req: Request, res: Response) => {
  await membership.promoteOfficer(
    getUserId(req),
    req.params.id as string,
    req.params.userId as string,
  )
  res.status(204).end()
})

guildsRouter.post('/:id/members/:userId/demote', async (req: Request, res: Response) => {
  await membership.demoteOfficer(
    getUserId(req),
    req.params.id as string,
    req.params.userId as string,
  )
  res.status(204).end()
})

guildsRouter.post('/:id/members/:userId/kick', async (req: Request, res: Response) => {
  await membership.kickMember(getUserId(req), req.params.id as string, req.params.userId as string)
  res.status(204).end()
})

guildsRouter.post(
  '/:id/transfer',
  validateBody(transferSchema),
  async (req: Request, res: Response) => {
    await membership.transferLeadership(
      getUserId(req),
      req.params.id as string,
      req.body.userId as string,
    )
    res.status(204).end()
  },
)

// ── Chat ─────────────────────────────────────────────────────

guildsRouter.get('/:id/messages', async (req: Request, res: Response) => {
  const before = typeof req.query.before === 'string' ? req.query.before : undefined
  res.json(await chat.listMessages(getUserId(req), req.params.id as string, before))
})

guildsRouter.post(
  '/:id/messages',
  validateBody(postMessageSchema),
  async (req: Request, res: Response) => {
    const message = await chat.postMessage(
      getUserId(req),
      req.params.id as string,
      req.body.content as string,
      req.body.replyToId as string | undefined,
    )
    res.status(201).json({ message })
  },
)

guildsRouter.post('/:id/messages/read', async (req: Request, res: Response) => {
  await chat.markRead(getUserId(req), req.params.id as string)
  res.status(204).end()
})

guildsRouter.delete('/:id/messages/:messageId', async (req: Request, res: Response) => {
  await chat.deleteMessage(
    getUserId(req),
    req.params.id as string,
    req.params.messageId as string,
  )
  res.status(204).end()
})

// ── Statistiques ─────────────────────────────────────────────

guildsRouter.get('/:id/stats', async (req: Request, res: Response) => {
  res.json(await guilds.getGuildStats(getUserId(req), req.params.id as string))
})
