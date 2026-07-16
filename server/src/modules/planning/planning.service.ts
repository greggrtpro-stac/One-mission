import type {
  PlanningCategoryStat,
  PlanningEventActionResult,
  PlanningStats,
  QuestActionResult,
} from '@one-mission/shared'
import type { PlanningEvent, Quest } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { getFallbackCategory as getFallbackQuestCategory } from '../quests/quest-categories.service.js'
import { completeQuest, uncompleteQuest } from '../quests/quests.service.js'
import { ensureDefaultCategories, getOwnedCategory } from './planning-categories.service.js'
import { toPlanningEventDto, type PlanningEventWithQuest } from './planning.mapper.js'

async function getOwnedEvent(userId: string, eventId: string): Promise<PlanningEventWithQuest> {
  const event = await prisma.planningEvent.findFirst({
    where: { id: eventId, userId },
    include: { quest: true, planningCategory: true },
  })
  if (!event) throw new ApiError(404, 'Événement introuvable')
  return event
}

/** Événements chevauchant [from, to[ — permet d'afficher n'importe quelle semaine. */
export async function listEvents(
  userId: string,
  from: Date,
  to: Date,
): Promise<PlanningEventWithQuest[]> {
  await ensureDefaultCategories(userId)
  return prisma.planningEvent.findMany({
    where: { userId, startAt: { lt: to }, endAt: { gt: from } },
    include: { quest: true, planningCategory: true },
    orderBy: { startAt: 'asc' },
    take: 1000,
  })
}

export interface EventInput {
  title: string
  description?: string | null
  notes?: string | null
  categoryId: string
  priority: string
  startAt: string
  endAt: string
  reminderMinutes?: number | null
}

export async function createEvent(
  userId: string,
  input: EventInput,
): Promise<PlanningEventWithQuest> {
  await getOwnedCategory(userId, input.categoryId)
  const event = await prisma.planningEvent.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      notes: input.notes ?? null,
      categoryId: input.categoryId,
      priority: input.priority as PlanningEvent['priority'],
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      reminderMinutes: input.reminderMinutes ?? null,
    },
    include: { quest: true, planningCategory: true },
  })
  return event
}

export async function updateEvent(
  userId: string,
  eventId: string,
  input: Partial<EventInput> & { status?: 'PLANNED' | 'CANCELLED' },
): Promise<PlanningEventWithQuest> {
  const event = await getOwnedEvent(userId, eventId)

  if (input.categoryId !== undefined) await getOwnedCategory(userId, input.categoryId)

  // Cohérence temporelle même quand une seule des deux bornes change (resize/drag).
  const startAt = input.startAt !== undefined ? new Date(input.startAt) : event.startAt
  const endAt = input.endAt !== undefined ? new Date(input.endAt) : event.endAt
  if (endAt <= startAt) throw new ApiError(400, "L'heure de fin doit être après l'heure de début")

  return prisma.planningEvent.update({
    where: { id: event.id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.priority !== undefined && {
        priority: input.priority as PlanningEvent['priority'],
      }),
      ...(input.startAt !== undefined && { startAt }),
      ...(input.endAt !== undefined && { endAt }),
      ...(input.status !== undefined && { status: input.status }),
      // Un rappel modifié repart de zéro (l'envoi réel viendra plus tard).
      ...(input.reminderMinutes !== undefined && {
        reminderMinutes: input.reminderMinutes,
        reminderSentAt: null,
      }),
    },
    include: { quest: true, planningCategory: true },
  })
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const event = await getOwnedEvent(userId, eventId)
  await prisma.planningEvent.delete({ where: { id: event.id } })
}

/**
 * Marque l'événement comme effectué. S'il est lié à une quête, c'est la quête
 * qui est complétée (XP incluse) — la synchro remet l'événement à DONE.
 */
export async function completeEvent(
  userId: string,
  eventId: string,
): Promise<PlanningEventActionResult> {
  const event = await getOwnedEvent(userId, eventId)

  let xp: QuestActionResult['xp'] = null
  if (event.questId) {
    xp = (await completeQuest(userId, event.questId)).xp
  } else {
    await prisma.planningEvent.update({ where: { id: event.id }, data: { status: 'DONE' } })
  }

  return { event: toPlanningEventDto(await getOwnedEvent(userId, eventId)), xp }
}

/** Repasse l'événement en planifié (décomplétion de la quête liée si besoin). */
export async function uncompleteEvent(
  userId: string,
  eventId: string,
): Promise<PlanningEventActionResult> {
  const event = await getOwnedEvent(userId, eventId)

  let xp: QuestActionResult['xp'] = null
  if (event.questId) {
    xp = (await uncompleteQuest(userId, event.questId)).xp
  }
  await prisma.planningEvent.update({ where: { id: event.id }, data: { status: 'PLANNED' } })

  return { event: toPlanningEventDto(await getOwnedEvent(userId, eventId)), xp }
}

/** Transforme un événement en quête liée (statut remis à planifié pour repartir sainement). */
export async function convertToQuest(
  userId: string,
  eventId: string,
  input: { difficulty: string; dueDate: string; dueTime?: string | null },
): Promise<PlanningEventWithQuest> {
  const event = await getOwnedEvent(userId, eventId)
  if (event.questId) throw new ApiError(409, 'Cet événement est déjà lié à une quête')

  // Les catégories de Planning et de Quêtes restent découplées : la quête
  // naît dans la catégorie de Quêtes du même nom que celle de l'événement si
  // elle existe, sinon dans la catégorie de repli (symétrique du choix fait
  // par « Ajouter au Planning » à la création d'une quête).
  const questCategory =
    (await prisma.questCategory.findFirst({
      where: { userId, name: event.planningCategory.name },
    })) ?? (await getFallbackQuestCategory(userId))

  await prisma.$transaction(async (tx) => {
    const quest = await tx.quest.create({
      data: {
        userId,
        title: event.title,
        description: event.description,
        categoryId: questCategory.id,
        priority: event.priority,
        difficulty: input.difficulty as Quest['difficulty'],
        dueDate: new Date(input.dueDate),
        dueTime: input.dueTime ?? null,
      },
    })
    await tx.planningEvent.update({
      where: { id: event.id },
      data: { questId: quest.id, status: 'PLANNED' },
    })
  })

  return getOwnedEvent(userId, eventId)
}

/** Statistiques sur [from, to[ — les durées sont bornées à la plage demandée. */
export async function getStats(userId: string, from: Date, to: Date): Promise<PlanningStats> {
  const [events, categories] = await Promise.all([
    prisma.planningEvent.findMany({
      where: { userId, startAt: { lt: to }, endAt: { gt: from } },
    }),
    prisma.planningCategory.findMany({ where: { userId } }),
  ])
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  const clippedMinutes = (e: PlanningEvent) => {
    const start = Math.max(e.startAt.getTime(), from.getTime())
    const end = Math.min(e.endAt.getTime(), to.getTime())
    return Math.max(0, Math.round((end - start) / 60000))
  }

  let plannedMinutes = 0
  let doneMinutes = 0
  let eventsDone = 0
  const byCategory = new Map<string, PlanningCategoryStat>()

  for (const event of events) {
    if (event.status === 'CANCELLED') continue
    const minutes = clippedMinutes(event)
    plannedMinutes += minutes

    const category = categoryById.get(event.categoryId)
    const stat = byCategory.get(event.categoryId) ?? {
      categoryId: event.categoryId,
      name: category?.name ?? 'Autre',
      color: category?.color ?? '#6B7280',
      icon: category?.icon ?? '📁',
      plannedMinutes: 0,
      doneMinutes: 0,
    }
    stat.plannedMinutes += minutes
    if (event.status === 'DONE') {
      doneMinutes += minutes
      eventsDone += 1
      stat.doneMinutes += minutes
    }
    byCategory.set(event.categoryId, stat)
  }

  return {
    plannedMinutes,
    doneMinutes,
    adherenceRate: plannedMinutes > 0 ? Math.round((doneMinutes / plannedMinutes) * 100) : 0,
    eventsCount: events.filter((e) => e.status !== 'CANCELLED').length,
    eventsDone,
    categories: [...byCategory.values()].sort((a, b) => b.plannedMinutes - a.plannedMinutes),
  }
}
