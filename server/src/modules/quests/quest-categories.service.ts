import {
  DEFAULT_CATEGORY_ICON,
  DEFAULT_QUEST_CATEGORY_COLOR,
  type QuestCategoryDto,
  type XpResult,
} from '@one-mission/shared'
import type { QuestCategory } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { awardXp } from '../gamification/gamification.service.js'

export function toQuestCategoryDto(
  category: QuestCategory & { _count: { quests: number } },
): QuestCategoryDto {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    sortOrder: category.sortOrder,
    isDefault: category.isDefault,
    questsCount: category._count.quests,
  }
}

/**
 * Catégories par défaut, créées une seule fois au premier accès (voir
 * ensureDefaultQuestCategories) — à garder en correspondance exacte avec le
 * backfill de la migration quest_categories_custom, qui pose le même jeu pour
 * les utilisateurs qui avaient déjà des quêtes. Une seule porte isDefault
 * (catégorie de repli, jamais 0 par utilisateur — voir deleteCategory).
 */
const DEFAULT_QUEST_CATEGORIES = [
  { name: 'Sport', icon: '💪', color: '#F97316' },
  { name: 'Travail', icon: '💼', color: '#3B82F6' },
  { name: 'Études', icon: '📚', color: '#10B981' },
  { name: 'Santé', icon: '❤️', color: '#EF4444' },
  { name: 'Personnel', icon: '🎯', color: '#8B5CF6' },
  { name: 'Finance', icon: '💰', color: '#EAB308' },
  { name: 'Autre', icon: '📁', color: '#6B7280' },
] as const

export async function ensureDefaultQuestCategories(userId: string): Promise<void> {
  const existing = await prisma.questCategory.count({ where: { userId } })
  if (existing > 0) return

  await prisma.questCategory.createMany({
    data: DEFAULT_QUEST_CATEGORIES.map((def, i) => ({
      userId,
      name: def.name,
      icon: def.icon,
      color: def.color,
      isDefault: def.name === 'Autre',
      sortOrder: i,
    })),
  })
}

export async function listCategories(userId: string): Promise<QuestCategoryDto[]> {
  await ensureDefaultQuestCategories(userId)
  const categories = await prisma.questCategory.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { quests: true } } },
  })
  return categories.map(toQuestCategoryDto)
}

export async function getOwnedCategory(userId: string, id: string): Promise<QuestCategory> {
  const category = await prisma.questCategory.findFirst({ where: { id, userId } })
  if (!category) throw new ApiError(404, 'Catégorie introuvable')
  return category
}

/**
 * Catégorie de repli de l'utilisateur (créée si besoin) — utilisée quand une
 * quête naît sans choix explicite, p. ex. conversion d'un événement Planning.
 */
export async function getFallbackCategory(userId: string): Promise<QuestCategory> {
  await ensureDefaultQuestCategories(userId)
  const category =
    (await prisma.questCategory.findFirst({ where: { userId, isDefault: true } })) ??
    (await prisma.questCategory.findFirst({ where: { userId }, orderBy: { sortOrder: 'asc' } }))
  if (!category) throw new ApiError(500, 'Aucune catégorie de quêtes disponible')
  return category
}

export async function createCategory(
  userId: string,
  input: { name: string; color?: string; icon?: string | null },
): Promise<QuestCategoryDto> {
  await ensureDefaultQuestCategories(userId)

  const existing = await prisma.questCategory.findFirst({ where: { userId, name: input.name } })
  if (existing) throw new ApiError(409, 'Une catégorie porte déjà ce nom')

  const max = await prisma.questCategory.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  })

  const category = await prisma.questCategory.create({
    data: {
      userId,
      name: input.name,
      // Violet One Mission par défaut ; l'utilisateur peut le changer à tout moment.
      color: input.color ?? DEFAULT_QUEST_CATEGORY_COLOR,
      icon: input.icon ?? DEFAULT_CATEGORY_ICON,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
    include: { _count: { select: { quests: true } } },
  })
  return toQuestCategoryDto(category)
}

export async function updateCategory(
  userId: string,
  id: string,
  input: Partial<{ name: string; color: string; icon: string | null }>,
): Promise<QuestCategoryDto> {
  await getOwnedCategory(userId, id)

  if (input.name !== undefined) {
    const clash = await prisma.questCategory.findFirst({
      where: { userId, name: input.name, id: { not: id } },
    })
    if (clash) throw new ApiError(409, 'Une catégorie porte déjà ce nom')
  }

  const category = await prisma.questCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      // Effacer l'icône (null) retombe sur l'emoji par défaut : jamais vide.
      ...(input.icon !== undefined && { icon: input.icon ?? DEFAULT_CATEGORY_ICON }),
    },
    include: { _count: { select: { quests: true } } },
  })
  return toQuestCategoryDto(category)
}

export async function reorderCategories(userId: string, ids: string[]): Promise<void> {
  const owned = await prisma.questCategory.findMany({ where: { userId }, select: { id: true } })
  const ownedIds = new Set(owned.map((c) => c.id))
  const orderedIds = ids.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.questCategory.update({ where: { id }, data: { sortOrder: index } }),
    ),
  )
}

export type DeleteQuestCategoryStrategy =
  | { strategy: 'reassign'; targetCategoryId: string }
  | { strategy: 'deleteQuests' }

/**
 * Ne supprime jamais silencieusement : soit les quêtes de la catégorie sont
 * réaffectées à une autre catégorie du même utilisateur, soit elles sont
 * supprimées explicitement — toujours dans la même transaction que la
 * suppression de la catégorie (la contrainte FK Restrict bloquerait sinon).
 * Supprimer des quêtes terminées reprend leur XP (même règle que la
 * suppression individuelle : pas de farming en créant/terminant/supprimant).
 */
export async function deleteCategory(
  userId: string,
  id: string,
  strategy: DeleteQuestCategoryStrategy,
): Promise<{ xp: XpResult | null }> {
  const category = await getOwnedCategory(userId, id)

  const total = await prisma.questCategory.count({ where: { userId } })
  if (total <= 1) {
    throw new ApiError(400, 'Impossible de supprimer la dernière catégorie')
  }

  let xpToReclaim = 0

  await prisma.$transaction(async (tx) => {
    if (strategy.strategy === 'reassign') {
      if (strategy.targetCategoryId === id) {
        throw new ApiError(400, 'La catégorie de destination doit être différente')
      }
      const target = await tx.questCategory.findFirst({
        where: { id: strategy.targetCategoryId, userId },
      })
      if (!target) throw new ApiError(404, 'Catégorie de destination introuvable')
      await tx.quest.updateMany({
        where: { categoryId: id },
        data: { categoryId: strategy.targetCategoryId },
      })
      // L'historique des complétions suit la même réaffectation (stats).
      await tx.questCompletion.updateMany({
        where: { categoryId: id },
        data: { categoryId: strategy.targetCategoryId },
      })
    } else {
      const reclaimed = await tx.quest.aggregate({
        where: { categoryId: id, status: 'DONE' },
        _sum: { xpAwarded: true },
      })
      xpToReclaim = reclaimed._sum.xpAwarded ?? 0
      // Les événements Planning liés redeviennent libres (questId → SetNull),
      // les complétions gardent leur ligne (categoryId → SetNull à la suppression
      // de la catégorie).
      await tx.quest.deleteMany({ where: { categoryId: id } })
    }

    if (category.isDefault) {
      const next = await tx.questCategory.findFirst({
        where: { userId, id: { not: id } },
        orderBy: { sortOrder: 'asc' },
      })
      if (next) {
        await tx.questCategory.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }

    await tx.questCategory.delete({ where: { id } })
  })

  const xp = xpToReclaim > 0 ? await awardXp(userId, -xpToReclaim) : null
  return { xp }
}
