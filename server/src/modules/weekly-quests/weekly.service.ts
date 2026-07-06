import {
  XP_BY_DIFFICULTY,
  type Difficulty,
  type WeeklyQuestActionResult,
  type WeeklyQuestDto,
} from '@one-mission/shared'
import type { WeeklyQuest } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { currentWeekStart } from '../../utils/week.js'
import { awardXp } from '../gamification/gamification.service.js'

export function toWeeklyDto(wq: WeeklyQuest): WeeklyQuestDto {
  return {
    id: wq.id,
    title: wq.title,
    description: wq.description,
    difficulty: wq.difficulty,
    sortOrder: wq.sortOrder,
    completedAt: wq.completedAt?.toISOString() ?? null,
    totalCompletions: wq.totalCompletions,
    weekStart: wq.weekStart.toISOString().slice(0, 10),
  }
}

/**
 * Réinitialisation manuelle (bouton « Nouvelle semaine ») : décoche toutes les
 * quêtes actives et incrémente l'historique de celles qui étaient complétées.
 * Aucun reset automatique — les coches restent en place tant que l'utilisateur
 * ne le demande pas.
 */
export async function resetWeek(userId: string): Promise<WeeklyQuest[]> {
  const weekStart = currentWeekStart()
  const quests = await prisma.weeklyQuest.findMany({
    where: { userId, isActive: true },
  })

  await prisma.$transaction(
    quests.map((wq) =>
      prisma.weeklyQuest.update({
        where: { id: wq.id },
        data: {
          weekStart,
          completedAt: null,
          totalCompletions: wq.completedAt ? wq.totalCompletions + 1 : wq.totalCompletions,
        },
      }),
    ),
  )
  return listWeekly(userId)
}

export async function listWeekly(userId: string): Promise<WeeklyQuest[]> {
  return prisma.weeklyQuest.findMany({
    where: { userId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function createWeekly(
  userId: string,
  input: { title: string; description?: string | null; difficulty: string },
): Promise<WeeklyQuest> {
  const max = await prisma.weeklyQuest.aggregate({
    where: { userId, isActive: true },
    _max: { sortOrder: true },
  })
  return prisma.weeklyQuest.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      difficulty: input.difficulty as WeeklyQuest['difficulty'],
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      weekStart: currentWeekStart(),
    },
  })
}

async function getOwned(userId: string, id: string): Promise<WeeklyQuest> {
  const wq = await prisma.weeklyQuest.findFirst({ where: { id, userId, isActive: true } })
  if (!wq) throw new ApiError(404, 'Quête hebdomadaire introuvable')
  return wq
}

export async function updateWeekly(
  userId: string,
  id: string,
  input: Partial<{ title: string; description: string | null; difficulty: string }>,
): Promise<WeeklyQuest> {
  const wq = await getOwned(userId, id)
  return prisma.weeklyQuest.update({
    where: { id: wq.id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.difficulty !== undefined && {
        difficulty: input.difficulty as WeeklyQuest['difficulty'],
      }),
    },
  })
}

export async function deleteWeekly(userId: string, id: string): Promise<void> {
  const wq = await getOwned(userId, id)
  await prisma.weeklyQuest.delete({ where: { id: wq.id } })
}

export async function reorderWeekly(userId: string, ids: string[]): Promise<void> {
  const owned = await prisma.weeklyQuest.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((w) => w.id))
  const orderedIds = ids.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.weeklyQuest.update({ where: { id }, data: { sortOrder: index + 1 } }),
    ),
  )
}

export async function completeWeekly(
  userId: string,
  id: string,
): Promise<WeeklyQuestActionResult> {
  const wq = await getOwned(userId, id)
  if (wq.completedAt) return { weeklyQuest: toWeeklyDto(wq), xp: null }

  const updated = await prisma.weeklyQuest.update({
    where: { id: wq.id },
    data: { completedAt: new Date() },
  })
  const xp = await awardXp(userId, XP_BY_DIFFICULTY[wq.difficulty as Difficulty] ?? 0)
  return { weeklyQuest: toWeeklyDto(updated), xp }
}

export async function uncompleteWeekly(
  userId: string,
  id: string,
): Promise<WeeklyQuestActionResult> {
  const wq = await getOwned(userId, id)
  if (!wq.completedAt) return { weeklyQuest: toWeeklyDto(wq), xp: null }

  const updated = await prisma.weeklyQuest.update({
    where: { id: wq.id },
    data: { completedAt: null },
  })
  const xp = await awardXp(userId, -(XP_BY_DIFFICULTY[wq.difficulty as Difficulty] ?? 0))
  return { weeklyQuest: toWeeklyDto(updated), xp }
}
