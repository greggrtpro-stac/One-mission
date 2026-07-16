import {
  AUTO_CATEGORY_COLORS,
  DEFAULT_CATEGORY_ICON,
  type PlanningCategoryDto,
} from '@one-mission/shared'
import type { PlanningCategory } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'

export function toPlanningCategoryDto(
  category: PlanningCategory & { _count: { events: number } },
): PlanningCategoryDto {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    sortOrder: category.sortOrder,
    isDefault: category.isDefault,
    eventsCount: category._count.events,
  }
}

/**
 * Catégories par défaut, créées une seule fois au premier accès (voir
 * ensureDefaultCategories) — mêmes noms que la table de correspondance du
 * backfill de migration, complétées pour couvrir toute la palette auto à 9
 * couleurs. Une seule porte isDefault (catégorie de repli, jamais 0 par
 * utilisateur — voir deleteCategory).
 */
const DEFAULT_CATEGORIES = [
  { name: 'Travail', icon: '💼' },
  { name: 'Études', icon: '🎓' },
  { name: 'Sport', icon: '🏋️' },
  { name: 'Santé', icon: '❤️' },
  { name: 'Lecture', icon: '📚' },
  { name: 'Business', icon: '💰' },
  { name: 'Personnel', icon: '👨‍👩‍👧' },
  { name: 'Loisirs', icon: '🎮' },
  { name: 'Autre', icon: '🗂️' },
] as const

export async function ensureDefaultCategories(userId: string): Promise<void> {
  const existing = await prisma.planningCategory.count({ where: { userId } })
  if (existing > 0) return

  await prisma.planningCategory.createMany({
    data: DEFAULT_CATEGORIES.map((def, i) => ({
      userId,
      name: def.name,
      icon: def.icon,
      color: AUTO_CATEGORY_COLORS[i % AUTO_CATEGORY_COLORS.length]!.hex,
      isDefault: def.name === 'Autre',
      sortOrder: i,
    })),
  })
}

/** Première couleur de la palette auto non utilisée, sinon on reboucle. */
async function pickAutoColor(userId: string): Promise<string> {
  const existing = await prisma.planningCategory.findMany({
    where: { userId },
    select: { color: true },
  })
  const used = new Set(existing.map((c) => c.color))
  const free = AUTO_CATEGORY_COLORS.find((c) => !used.has(c.hex))
  return free?.hex ?? AUTO_CATEGORY_COLORS[existing.length % AUTO_CATEGORY_COLORS.length]!.hex
}

export async function listCategories(userId: string): Promise<PlanningCategoryDto[]> {
  await ensureDefaultCategories(userId)
  const categories = await prisma.planningCategory.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { events: true } } },
  })
  return categories.map(toPlanningCategoryDto)
}

export async function getOwnedCategory(userId: string, id: string): Promise<PlanningCategory> {
  const category = await prisma.planningCategory.findFirst({ where: { id, userId } })
  if (!category) throw new ApiError(404, 'Catégorie introuvable')
  return category
}

export async function createCategory(
  userId: string,
  input: { name: string; color?: string; icon?: string | null },
): Promise<PlanningCategoryDto> {
  await ensureDefaultCategories(userId)

  const existing = await prisma.planningCategory.findFirst({ where: { userId, name: input.name } })
  if (existing) throw new ApiError(409, 'Une catégorie porte déjà ce nom')

  const max = await prisma.planningCategory.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  })
  const color = input.color ?? (await pickAutoColor(userId))

  const category = await prisma.planningCategory.create({
    data: {
      userId,
      name: input.name,
      color,
      icon: input.icon ?? DEFAULT_CATEGORY_ICON,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
    include: { _count: { select: { events: true } } },
  })
  return toPlanningCategoryDto(category)
}

export async function updateCategory(
  userId: string,
  id: string,
  input: Partial<{ name: string; color: string; icon: string | null }>,
): Promise<PlanningCategoryDto> {
  await getOwnedCategory(userId, id)

  if (input.name !== undefined) {
    const clash = await prisma.planningCategory.findFirst({
      where: { userId, name: input.name, id: { not: id } },
    })
    if (clash) throw new ApiError(409, 'Une catégorie porte déjà ce nom')
  }

  const category = await prisma.planningCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      // Effacer l'icône (null) retombe sur l'emoji par défaut : jamais vide.
      ...(input.icon !== undefined && { icon: input.icon ?? DEFAULT_CATEGORY_ICON }),
    },
    include: { _count: { select: { events: true } } },
  })
  return toPlanningCategoryDto(category)
}

export async function reorderCategories(userId: string, ids: string[]): Promise<void> {
  const owned = await prisma.planningCategory.findMany({ where: { userId }, select: { id: true } })
  const ownedIds = new Set(owned.map((c) => c.id))
  const orderedIds = ids.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.planningCategory.update({ where: { id }, data: { sortOrder: index } }),
    ),
  )
}

export type DeleteCategoryStrategy =
  | { strategy: 'reassign'; targetCategoryId: string }
  | { strategy: 'deleteEvents' }

/**
 * Ne supprime jamais silencieusement : soit les événements de la catégorie
 * sont réaffectés à une autre catégorie du même utilisateur, soit ils sont
 * supprimés explicitement — toujours dans la même transaction que la
 * suppression de la catégorie (la contrainte FK Restrict bloquerait sinon).
 */
export async function deleteCategory(
  userId: string,
  id: string,
  strategy: DeleteCategoryStrategy,
): Promise<void> {
  const category = await getOwnedCategory(userId, id)

  const total = await prisma.planningCategory.count({ where: { userId } })
  if (total <= 1) {
    throw new ApiError(400, 'Impossible de supprimer la dernière catégorie')
  }

  await prisma.$transaction(async (tx) => {
    if (strategy.strategy === 'reassign') {
      if (strategy.targetCategoryId === id) {
        throw new ApiError(400, 'La catégorie de destination doit être différente')
      }
      const target = await tx.planningCategory.findFirst({
        where: { id: strategy.targetCategoryId, userId },
      })
      if (!target) throw new ApiError(404, 'Catégorie de destination introuvable')
      await tx.planningEvent.updateMany({
        where: { categoryId: id },
        data: { categoryId: strategy.targetCategoryId },
      })
    } else {
      await tx.planningEvent.deleteMany({ where: { categoryId: id } })
    }

    if (category.isDefault) {
      const next = await tx.planningCategory.findFirst({
        where: { userId, id: { not: id } },
        orderBy: { sortOrder: 'asc' },
      })
      if (next) await tx.planningCategory.update({ where: { id: next.id }, data: { isDefault: true } })
    }

    await tx.planningCategory.delete({ where: { id } })
  })
}
