import type { Request, Response } from 'express'
import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'

const createFeedbackSchema = z.object({
  title: z.string().min(3, 'Titre trop court').max(120),
  description: z.string().min(10, 'Décris le problème en quelques phrases').max(5000),
  category: z.enum(['BUG', 'SUGGESTION', 'UI', 'PERFORMANCE', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  /** Route de l'app où le signalement a été fait (renseignée automatiquement). */
  page: z.string().max(200).optional(),
  /** Capture d'écran compressée côté client — data-URL d'image uniquement. */
  screenshot: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/, "Format d'image invalide")
    .optional(),
})

/** Anti-spam : un testeur n'a aucune raison d'envoyer plus de 10 signalements / 15 min. */
const feedbackRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Trop de signalements envoyés, réessaie dans quelques minutes' },
})

export const feedbackRouter = Router()
feedbackRouter.use(requireAuth)

feedbackRouter.post(
  '/',
  feedbackRateLimit,
  validateBody(createFeedbackSchema),
  async (req: Request, res: Response) => {
    const data = req.body as z.infer<typeof createFeedbackSchema>
    const feedback = await prisma.feedback.create({
      data: { userId: getUserId(req), ...data },
      select: { id: true, createdAt: true },
    })
    res.status(201).json({ feedback })
  },
)
