import { GUILD_MESSAGE_MAX_LENGTH } from '@one-mission/shared'
import { z } from 'zod'
import { colorSchema } from '../planning/planning-categories.schemas.js'

/** Même garde-fou que les catégories : une séquence emoji ZWJ peut monter à 15 unités UTF-16. */
const iconSchema = z.string().min(1).max(20)

const nameSchema = z
  .string()
  .trim()
  .min(3, 'Le nom doit faire au moins 3 caractères')
  .max(30, 'Le nom ne peut pas dépasser 30 caractères')

const descriptionSchema = z.string().trim().max(500).optional()

/** Niveau minimum requis pour rejoindre (1 = ouvert à tous, borné au niveau max atteignable). */
const minLevelSchema = z.number().int().min(1).max(200)

export const createGuildSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  icon: iconSchema.optional(),
  color: colorSchema.optional(),
  minLevel: minLevelSchema.optional(),
  isOpen: z.boolean().optional(),
})

export const updateGuildSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.nullable().optional(),
  icon: iconSchema.optional(),
  color: colorSchema.optional(),
  minLevel: minLevelSchema.optional(),
  isOpen: z.boolean().optional(),
})

export const joinRequestSchema = z.object({
  message: z.string().trim().max(300).optional(),
})

export const inviteSchema = z.object({
  userId: z.string().min(1),
})

export const transferSchema = z.object({
  userId: z.string().min(1),
})

export const postMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message vide')
    .max(GUILD_MESSAGE_MAX_LENGTH, `${GUILD_MESSAGE_MAX_LENGTH} caractères maximum`),
  replyToId: z.string().min(1).optional(),
})
