import { XP_BY_DIFFICULTY, type Difficulty, type QuestActionResult } from '@one-mission/shared'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { awardXp } from '../gamification/gamification.service.js'
import { ensureDefaultCategories } from '../planning/planning-categories.service.js'
import { getOwnedCategory } from './quest-categories.service.js'
import { questCategoryRefSelect, toQuestDto, type QuestWithCategory } from './quests.mapper.js'

async function getOwnedQuest(userId: string, questId: string): Promise<QuestWithCategory> {
  const quest = await prisma.quest.findFirst({
    where: { id: questId, userId },
    include: { questCategory: questCategoryRefSelect },
  })
  if (!quest) throw new ApiError(404, 'Quête introuvable')
  return quest
}

/** Reflète l'état de la quête sur son événement Planning lié (s'il existe). */
async function syncPlanningEvent(userId: string, questId: string, status: 'PLANNED' | 'DONE') {
  await prisma.planningEvent.updateMany({ where: { userId, questId }, data: { status } })
}

export async function listQuests(userId: string): Promise<QuestWithCategory[]> {
  return prisma.quest.findMany({
    where: { userId },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    take: 1000,
    include: { questCategory: questCategoryRefSelect },
  })
}

export async function createQuest(
  userId: string,
  input: {
    title: string
    description?: string | null
    categoryId: string
    priority: string
    difficulty: string
    dueDate: string
    dueTime?: string | null
    /** Créneau optionnel : la quête apparaît aussi dans le Planning. */
    planning?: { startAt: string; endAt: string } | null
  },
): Promise<QuestWithCategory> {
  // La catégorie doit appartenir à l'utilisateur (404 sinon) — c'est aussi la
  // seule vérification nécessaire côté sécurité, l'id venant du client.
  const questCategory = await getOwnedCategory(userId, input.categoryId)

  // Catégories de Planning créées paresseusement si besoin, AVANT la
  // transaction (ensureDefaultCategories utilise le client Prisma partagé,
  // pas la transaction — la garantie d'existence doit être acquise avant).
  if (input.planning) await ensureDefaultCategories(userId)

  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.create({
      data: {
        userId,
        title: input.title,
        description: input.description ?? null,
        categoryId: input.categoryId,
        priority: input.priority as QuestWithCategory['priority'],
        difficulty: input.difficulty as QuestWithCategory['difficulty'],
        dueDate: new Date(input.dueDate),
        dueTime: input.dueTime ?? null,
      },
      include: { questCategory: questCategoryRefSelect },
    })

    if (input.planning) {
      // Les catégories de Quêtes et de Planning restent découplées ;
      // l'événement lié reprend la catégorie de Planning du même nom si elle
      // existe, sinon la catégorie de repli (isDefault).
      const category =
        (await tx.planningCategory.findFirst({ where: { userId, name: questCategory.name } })) ??
        (await tx.planningCategory.findFirst({ where: { userId, isDefault: true } }))
      if (!category) throw new ApiError(500, 'Aucune catégorie de planning disponible')

      await tx.planningEvent.create({
        data: {
          userId,
          questId: quest.id,
          title: input.title,
          description: input.description ?? null,
          categoryId: category.id,
          priority: input.priority as QuestWithCategory['priority'],
          startAt: new Date(input.planning.startAt),
          endAt: new Date(input.planning.endAt),
        },
      })
    }

    return quest
  })
}

export async function updateQuest(
  userId: string,
  questId: string,
  input: Partial<{
    title: string
    description: string | null
    categoryId: string
    priority: string
    difficulty: string
    dueDate: string
    dueTime: string | null
    progress: number
    status: 'TODO' | 'IN_PROGRESS' | 'CANCELLED'
  }>,
): Promise<QuestActionResult> {
  const quest = await getOwnedQuest(userId, questId)
  if (input.categoryId !== undefined) await getOwnedCategory(userId, input.categoryId)

  // Repasser une quête terminée en TODO/IN_PROGRESS retire l'XP versée.
  let xp = null
  if (quest.status === 'DONE' && input.status && input.status !== 'CANCELLED') {
    xp = await awardXp(userId, -quest.xpAwarded)
    await syncPlanningEvent(userId, quest.id, 'PLANNED')
  }

  const updated = await prisma.quest.update({
    where: { id: quest.id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.priority !== undefined && {
        priority: input.priority as QuestWithCategory['priority'],
      }),
      ...(input.difficulty !== undefined && {
        difficulty: input.difficulty as QuestWithCategory['difficulty'],
      }),
      ...(input.dueDate !== undefined && { dueDate: new Date(input.dueDate) }),
      ...(input.dueTime !== undefined && { dueTime: input.dueTime }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.status !== undefined && { status: input.status }),
      ...(xp !== null && { xpAwarded: 0, completedAt: null, progress: input.progress ?? 0 }),
    },
    include: { questCategory: questCategoryRefSelect },
  })

  return { quest: toQuestDto(updated), xp }
}

/** Termine la quête et crédite l'XP. Idempotent : une quête DONE ne re-crédite jamais. */
export async function completeQuest(userId: string, questId: string): Promise<QuestActionResult> {
  const quest = await getOwnedQuest(userId, questId)

  const xpAmount = XP_BY_DIFFICULTY[quest.difficulty as Difficulty] ?? 0

  // Garde de concurrence : ne complète que si pas déjà DONE.
  const { count } = await prisma.quest.updateMany({
    where: { id: quest.id, userId, status: { not: 'DONE' } },
    data: { status: 'DONE', progress: 100, completedAt: new Date(), xpAwarded: xpAmount },
  })

  const updated = await getOwnedQuest(userId, questId)
  if (count === 0) return { quest: toQuestDto(updated), xp: null }

  await syncPlanningEvent(userId, questId, 'DONE')
  const xp = await awardXp(userId, xpAmount)
  return { quest: toQuestDto(updated), xp }
}

/** Décoche une quête terminée : l'XP versée est reprise. */
export async function uncompleteQuest(userId: string, questId: string): Promise<QuestActionResult> {
  const quest = await getOwnedQuest(userId, questId)
  if (quest.status !== 'DONE') return { quest: toQuestDto(quest), xp: null }

  const xp = quest.xpAwarded > 0 ? await awardXp(userId, -quest.xpAwarded) : null
  const updated = await prisma.quest.update({
    where: { id: quest.id },
    data: { status: 'TODO', progress: 0, completedAt: null, xpAwarded: 0 },
    include: { questCategory: questCategoryRefSelect },
  })
  await syncPlanningEvent(userId, questId, 'PLANNED')
  return { quest: toQuestDto(updated), xp }
}

/** Supprime la quête ; si elle était terminée, l'XP versée est reprise. */
export async function deleteQuest(userId: string, questId: string) {
  const quest = await getOwnedQuest(userId, questId)
  const xp = quest.xpAwarded > 0 ? await awardXp(userId, -quest.xpAwarded) : null
  await prisma.quest.delete({ where: { id: quest.id } })
  return { xp }
}
