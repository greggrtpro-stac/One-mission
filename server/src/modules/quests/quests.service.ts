import { XP_BY_DIFFICULTY, type Difficulty, type QuestActionResult } from '@one-mission/shared'
import type { Quest } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { awardXp } from '../gamification/gamification.service.js'
import { toQuestDto } from './quests.mapper.js'

async function getOwnedQuest(userId: string, questId: string): Promise<Quest> {
  const quest = await prisma.quest.findFirst({ where: { id: questId, userId } })
  if (!quest) throw new ApiError(404, 'Quête introuvable')
  return quest
}

export async function listQuests(userId: string): Promise<Quest[]> {
  return prisma.quest.findMany({
    where: { userId },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    take: 1000,
  })
}

export async function createQuest(
  userId: string,
  input: {
    title: string
    description?: string | null
    category: string
    priority: string
    difficulty: string
    dueDate: string
    dueTime?: string | null
  },
): Promise<Quest> {
  return prisma.quest.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      category: input.category as Quest['category'],
      priority: input.priority as Quest['priority'],
      difficulty: input.difficulty as Quest['difficulty'],
      dueDate: new Date(input.dueDate),
      dueTime: input.dueTime ?? null,
    },
  })
}

export async function updateQuest(
  userId: string,
  questId: string,
  input: Partial<{
    title: string
    description: string | null
    category: string
    priority: string
    difficulty: string
    dueDate: string
    dueTime: string | null
    progress: number
    status: 'TODO' | 'IN_PROGRESS' | 'CANCELLED'
  }>,
): Promise<QuestActionResult> {
  const quest = await getOwnedQuest(userId, questId)

  // Repasser une quête terminée en TODO/IN_PROGRESS retire l'XP versée.
  let xp = null
  if (quest.status === 'DONE' && input.status && input.status !== 'CANCELLED') {
    xp = await awardXp(userId, -quest.xpAwarded)
  }

  const updated = await prisma.quest.update({
    where: { id: quest.id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category as Quest['category'] }),
      ...(input.priority !== undefined && { priority: input.priority as Quest['priority'] }),
      ...(input.difficulty !== undefined && {
        difficulty: input.difficulty as Quest['difficulty'],
      }),
      ...(input.dueDate !== undefined && { dueDate: new Date(input.dueDate) }),
      ...(input.dueTime !== undefined && { dueTime: input.dueTime }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.status !== undefined && { status: input.status }),
      ...(xp !== null && { xpAwarded: 0, completedAt: null, progress: input.progress ?? 0 }),
    },
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
  })
  return { quest: toQuestDto(updated), xp }
}

/** Supprime la quête ; si elle était terminée, l'XP versée est reprise. */
export async function deleteQuest(userId: string, questId: string) {
  const quest = await getOwnedQuest(userId, questId)
  const xp = quest.xpAwarded > 0 ? await awardXp(userId, -quest.xpAwarded) : null
  await prisma.quest.delete({ where: { id: quest.id } })
  return { xp }
}
