import { z } from 'zod'
import { colorSchema } from '../planning/planning-categories.schemas.js'

/**
 * Un emoji peut être une séquence ZWJ multi-codepoints (👨‍👩‍👧‍👦 = 11 unités
 * UTF-16, certaines séquences montent à 15) : la borne large reste un simple
 * garde-fou contre un texte libre, pas une validation d'emoji.
 */
const iconSchema = z.string().min(1).max(20)

export const createQuestCategorySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(40),
  /** Absente = violet One Mission (DEFAULT_QUEST_CATEGORY_COLOR). */
  color: colorSchema.optional(),
  /** Absente = emoji par défaut 📁. */
  icon: iconSchema.nullable().optional(),
})

export const updateQuestCategorySchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: colorSchema.optional(),
  icon: iconSchema.nullable().optional(),
})

export const reorderQuestCategoriesSchema = z.object({
  ids: z.array(z.string()).max(200),
})

/** Jamais de suppression silencieuse : le client doit choisir explicitement. */
export const deleteQuestCategorySchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('reassign'), targetCategoryId: z.string().min(1) }),
  z.object({ strategy: z.literal('deleteQuests') }),
])
