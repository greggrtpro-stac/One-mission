import { XP_BY_DIFFICULTY, type Difficulty, type QuestActionResult } from '@one-mission/shared'
import type { Quest } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { awardXp } from '../gamification/gamification.service.js'
import { toQuestDto } from './quests.mapper.js'

/** Minuit local du jour courant (les « jours » suivent l'heure du serveur). */
function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Jour courant en date UTC pure — format attendu par la colonne `dueDate` (@db.Date). */
function todayAsDbDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

/**
 * Réinitialisation quotidienne des quêtes journalières : toute quête terminée
 * un jour précédent est décochée (et re-datée à aujourd'hui) pour pouvoir être
 * refaite — l'XP déjà versée et la ligne d'historique (QuestCompletion) sont
 * conservées. Les quêtes non terminées ne sont pas touchées : elles restent
 * affichées jusqu'à leur accomplissement. Sans `userId`, s'applique à tous les
 * joueurs (tâche de minuit).
 *
 * Appelée paresseusement avant chaque lecture/action : fiable même si
 * l'utilisateur (ou le serveur) était hors ligne à minuit.
 */
export async function resetOutdatedDailies(userId?: string): Promise<void> {
  await prisma.quest.updateMany({
    where: { ...(userId && { userId }), status: 'DONE', completedAt: { lt: startOfToday() } },
    data: {
      status: 'TODO',
      progress: 0,
      completedAt: null,
      xpAwarded: 0,
      dueDate: todayAsDbDate(),
    },
  })
}

/** Supprime la ligne d'historique du cycle en cours (quête décochée le jour même). */
async function removeCurrentCompletion(quest: Quest): Promise<void> {
  if (!quest.completedAt) return
  await prisma.questCompletion.deleteMany({
    where: { questId: quest.id, completedAt: quest.completedAt },
  })
}

async function getOwnedQuest(userId: string, questId: string): Promise<Quest> {
  const quest = await prisma.quest.findFirst({ where: { id: questId, userId } })
  if (!quest) throw new ApiError(404, 'Quête introuvable')
  return quest
}

export async function listQuests(userId: string): Promise<Quest[]> {
  await resetOutdatedDailies(userId)
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
  await resetOutdatedDailies(userId)
  const quest = await getOwnedQuest(userId, questId)

  // Repasser une quête terminée en TODO/IN_PROGRESS retire l'XP versée et
  // efface l'accomplissement du jour de l'historique.
  let xp = null
  if (quest.status === 'DONE' && input.status && input.status !== 'CANCELLED') {
    xp = await awardXp(userId, -quest.xpAwarded)
    await removeCurrentCompletion(quest)
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
      ...(xp !== null && {
        xpAwarded: 0,
        completedAt: null,
        progress: input.progress ?? 0,
        totalCompletions: { decrement: 1 },
      }),
    },
  })

  return { quest: toQuestDto(updated), xp }
}

/**
 * Termine la quête pour aujourd'hui : crédite l'XP et archive l'accomplissement
 * dans l'historique (il survivra au reset de minuit et à une éventuelle
 * suppression de la quête). Idempotent : une quête DONE ne re-crédite jamais.
 */
export async function completeQuest(userId: string, questId: string): Promise<QuestActionResult> {
  await resetOutdatedDailies(userId)
  const quest = await getOwnedQuest(userId, questId)

  const xpAmount = XP_BY_DIFFICULTY[quest.difficulty as Difficulty] ?? 0

  // Garde de concurrence : ne complète que si pas déjà DONE.
  const { count } = await prisma.quest.updateMany({
    where: { id: quest.id, userId, status: { not: 'DONE' } },
    data: {
      status: 'DONE',
      progress: 100,
      completedAt: new Date(),
      xpAwarded: xpAmount,
      totalCompletions: { increment: 1 },
    },
  })

  const updated = await getOwnedQuest(userId, questId)
  if (count === 0) return { quest: toQuestDto(updated), xp: null }

  await prisma.questCompletion.create({
    data: {
      userId,
      questId: quest.id,
      category: quest.category,
      xpAwarded: xpAmount,
      completedAt: updated.completedAt ?? new Date(),
    },
  })

  const xp = await awardXp(userId, xpAmount)
  return { quest: toQuestDto(updated), xp }
}

/** Décoche une quête terminée aujourd'hui : XP reprise, historique du jour effacé. */
export async function uncompleteQuest(userId: string, questId: string): Promise<QuestActionResult> {
  await resetOutdatedDailies(userId)
  const quest = await getOwnedQuest(userId, questId)
  if (quest.status !== 'DONE') return { quest: toQuestDto(quest), xp: null }

  const xp = quest.xpAwarded > 0 ? await awardXp(userId, -quest.xpAwarded) : null
  await removeCurrentCompletion(quest)
  const updated = await prisma.quest.update({
    where: { id: quest.id },
    data: {
      status: 'TODO',
      progress: 0,
      completedAt: null,
      xpAwarded: 0,
      totalCompletions: { decrement: 1 },
    },
  })
  return { quest: toQuestDto(updated), xp }
}

/**
 * Supprime la quête. Seul le cycle en cours est repris (XP du jour + ligne
 * d'historique du jour) : les accomplissements des jours précédents restent
 * acquis dans les statistiques (leur questId passe simplement à null).
 */
export async function deleteQuest(userId: string, questId: string) {
  await resetOutdatedDailies(userId)
  const quest = await getOwnedQuest(userId, questId)
  const xp = quest.xpAwarded > 0 ? await awardXp(userId, -quest.xpAwarded) : null
  if (quest.status === 'DONE') await removeCurrentCompletion(quest)
  await prisma.quest.delete({ where: { id: quest.id } })
  return { xp }
}
