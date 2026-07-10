import { z } from 'zod'
import { difficultyEnum, priorityEnum } from '../quests/quests.schemas.js'

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format YYYY-MM-DD')

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure attendue au format HH:mm')

/** Bornes des rappels : 0 à 7 jours avant l'événement. */
const reminderSchema = z.number().int().min(0).max(10080).nullable()

export const createEventSchema = z
  .object({
    title: z.string().min(1, 'Titre requis').max(120),
    description: z.string().max(2000).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    categoryId: z.string().min(1, 'Catégorie requise'),
    priority: priorityEnum.default('MEDIUM'),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    reminderMinutes: reminderSchema.optional(),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: "L'heure de fin doit être après l'heure de début",
    path: ['endAt'],
  })

/** DONE ne passe jamais par ici : uniquement via /complete (synchro quête + XP). */
export const updateEventSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  categoryId: z.string().min(1).optional(),
  priority: priorityEnum.optional(),
  startAt: z.iso.datetime().optional(),
  endAt: z.iso.datetime().optional(),
  status: z.enum(['PLANNED', 'CANCELLED']).optional(),
  reminderMinutes: reminderSchema.optional(),
})

/** La date/heure locales sont calculées côté client (le serveur ignore le fuseau). */
export const convertToQuestSchema = z.object({
  difficulty: difficultyEnum.default('MEDIUM'),
  dueDate: dateSchema,
  dueTime: timeSchema.nullable().optional(),
})

export const rangeQuerySchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
})
