import { z } from 'zod'

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur attendue au format #RRGGBB')

/**
 * Un emoji peut être une séquence ZWJ multi-codepoints (👨‍👩‍👧‍👦 = 11 unités
 * UTF-16, certaines séquences montent à 15) : la borne large reste un simple
 * garde-fou contre un texte libre, pas une validation d'emoji.
 */
const iconSchema = z.string().min(1).max(20)

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(40),
  /** Absente = attribution automatique de la première couleur libre. */
  color: colorSchema.optional(),
  /** Absente = emoji par défaut 📁. */
  icon: iconSchema.nullable().optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: colorSchema.optional(),
  icon: iconSchema.nullable().optional(),
})

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string()).max(200),
})

/** Jamais de suppression silencieuse : le client doit choisir explicitement. */
export const deleteCategorySchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('reassign'), targetCategoryId: z.string().min(1) }),
  z.object({ strategy: z.literal('deleteEvents') }),
])
