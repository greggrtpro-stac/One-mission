import { z } from 'zod'

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format YYYY-MM-DD')

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure attendue au format HH:mm')

export const questCategoryEnum = z.enum([
  'SPORT',
  'TRAVAIL',
  'ETUDES',
  'SANTE',
  'PERSO',
  'FINANCE',
  'AUTRE',
])
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const difficultyEnum = z.enum(['TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'EPIC'])

/** Créneau Planning optionnel à la création d'une quête (« Ajouter au Planning »). */
const questPlanningSchema = z
  .object({
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: "L'heure de fin doit être après l'heure de début",
    path: ['endAt'],
  })

export const createQuestSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(120),
  description: z.string().max(2000).nullable().optional(),
  category: questCategoryEnum.default('AUTRE'),
  priority: priorityEnum.default('MEDIUM'),
  difficulty: difficultyEnum.default('MEDIUM'),
  dueDate: dateSchema,
  dueTime: timeSchema.nullable().optional(),
  planning: questPlanningSchema.nullable().optional(),
})

export const updateQuestSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: questCategoryEnum.optional(),
  priority: priorityEnum.optional(),
  difficulty: difficultyEnum.optional(),
  dueDate: dateSchema.optional(),
  dueTime: timeSchema.nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  /** DONE ne passe jamais par ici : uniquement via /complete (attribution d'XP). */
  status: z.enum(['TODO', 'IN_PROGRESS', 'CANCELLED']).optional(),
})

const milestoneSchema = z.object({
  id: z.string().min(1).max(50),
  title: z.string().min(1).max(160),
  done: z.boolean(),
})

export const upsertMainQuestSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(160),
  description: z.string().max(4000).nullable().optional(),
  targetDate: dateSchema.nullable().optional(),
  progress: z.number().int().min(0).max(100).default(0),
  milestones: z.array(milestoneSchema).max(20).default([]),
})

export const patchMainQuestSchema = upsertMainQuestSchema.partial()
