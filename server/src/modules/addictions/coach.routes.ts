import type { CoachMessageDto } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import type { CoachMessage } from '../../generated/prisma/client.js'
import { aiAvailable } from '../../lib/claude.js'
import { prisma } from '../../lib/prisma.js'
import { getUserId } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { validateBody } from '../../middleware/validate.js'
import { requireFeature } from '../subscriptions/entitlements.middleware.js'
import { askCoach, buildCoachContext } from './coach.service.js'

const sendSchema = z.object({
  content: z.string().min(1, 'Message vide').max(4000),
})

function toDto(m: CoachMessage): CoachMessageDto {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }
}

async function getOwnedAddiction(userId: string, id: string) {
  const addiction = await prisma.addiction.findFirst({
    where: { id, userId },
    include: { relapses: { orderBy: { occurredAt: 'asc' as const }, take: 100 } },
  })
  if (!addiction) throw new ApiError(404, 'Addiction introuvable')
  return addiction
}

/** Monté sur /api/addictions/:id/coach (mergeParams pour récupérer :id). */
export const coachRouter = Router({ mergeParams: true })
// Le coach IA est réservé à l'offre Max (requireAuth hérité du routeur parent).
coachRouter.use(requireFeature('coach_ai'))

coachRouter.get('/', async (req: Request, res: Response) => {
  const addiction = await getOwnedAddiction(getUserId(req), req.params.id as string)
  const messages = await prisma.coachMessage.findMany({
    where: { addictionId: addiction.id },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })
  res.json({
    messages: messages.map(toDto),
    aiAvailable,
    shareJournal: addiction.shareJournal,
  })
})

coachRouter.post('/', validateBody(sendSchema), async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const addiction = await getOwnedAddiction(userId, req.params.id as string)
  const content = (req.body.content as string).trim()

  const history = await prisma.coachMessage.findMany({
    where: { addictionId: addiction.id },
    orderBy: { createdAt: 'asc' },
  })

  // Contexte reconstruit à chaque tour : le coach voit toujours les chiffres à jour.
  const context = await buildCoachContext(userId, addiction)
  const reply = await askCoach(context, history, content)

  // On ne persiste qu'après une réponse réussie : en cas d'erreur IA, le
  // joueur garde son texte côté client et peut renvoyer sans doublon.
  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.coachMessage.create({
      data: { addictionId: addiction.id, role: 'USER', content },
    }),
    prisma.coachMessage.create({
      data: { addictionId: addiction.id, role: 'ASSISTANT', content: reply },
    }),
  ])

  res.status(201).json({ messages: [toDto(userMessage), toDto(assistantMessage)] })
})
