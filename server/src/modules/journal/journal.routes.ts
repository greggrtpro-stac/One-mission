import {
  JOURNAL_ENTRY_XP,
  type JournalAnalysis,
  type JournalEntryDto,
  type XpResult,
} from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { Prisma, type JournalEntry } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { validateBody } from '../../middleware/validate.js'
import { awardXp } from '../gamification/gamification.service.js'
import { aiAvailable, analyzeEntry } from './journal.service.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const upsertSchema = z.object({
  content: z.string().min(1, 'Le contenu est requis').max(20_000),
})

function parseDateParam(raw: unknown): { date: Date; label: string } {
  if (typeof raw !== 'string' || !DATE_RE.test(raw)) {
    throw new ApiError(400, 'Date invalide (attendu : YYYY-MM-DD)')
  }
  return { date: new Date(`${raw}T00:00:00.000Z`), label: raw }
}

function toDto(e: JournalEntry): JournalEntryDto {
  return {
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    content: e.content,
    aiScore: e.aiScore,
    aiAnalysis: e.aiAnalysis as JournalAnalysis | null,
    updatedAt: e.updatedAt.toISOString(),
  }
}

export const journalRouter = Router()
journalRouter.use(requireAuth)

journalRouter.get('/', async (req: Request, res: Response) => {
  const entries = await prisma.journalEntry.findMany({
    where: { userId: getUserId(req) },
    orderBy: { date: 'desc' },
    take: 60,
  })
  res.json({ entries: entries.map(toDto), aiAvailable })
})

journalRouter.get('/:date', async (req: Request, res: Response) => {
  const { date } = parseDateParam(req.params.date)
  const entry = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId: getUserId(req), date } },
  })
  res.json({ entry: entry ? toDto(entry) : null })
})

/** Crée ou met à jour l'entrée du jour. L'XP n'est versée qu'à la création. */
journalRouter.put('/:date', validateBody(upsertSchema), async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const { date } = parseDateParam(req.params.date)

  const existing = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId, date } },
  })

  const entry = existing
    ? await prisma.journalEntry.update({
        where: { id: existing.id },
        // Le contenu change : l'ancienne analyse ne s'applique plus.
        data: { content: req.body.content, aiAnalysis: Prisma.DbNull, aiScore: null },
      })
    : await prisma.journalEntry.create({
        data: { userId, date, content: req.body.content },
      })

  const xp: XpResult | null = existing ? null : await awardXp(userId, JOURNAL_ENTRY_XP)
  res.status(existing ? 200 : 201).json({ entry: toDto(entry), xp })
})

journalRouter.delete('/:date', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const { date } = parseDateParam(req.params.date)
  await prisma.journalEntry.deleteMany({ where: { userId, date } })
  res.status(204).end()
})

/** Lance l'analyse IA de l'entrée (Claude), puis la stocke sur l'entrée. */
journalRouter.post('/:date/analyze', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const { date, label } = parseDateParam(req.params.date)

  const entry = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId, date } },
  })
  if (!entry) throw new ApiError(404, 'Aucune entrée pour cette date')

  const analysis = await analyzeEntry(label, entry.content)
  const updated = await prisma.journalEntry.update({
    where: { id: entry.id },
    data: { aiAnalysis: analysis as unknown as Prisma.InputJsonValue, aiScore: analysis.score },
  })
  res.json({ entry: toDto(updated) })
})
