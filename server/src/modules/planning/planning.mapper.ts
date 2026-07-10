import type { PlanningEventDto, PlanningEventStatus } from '@one-mission/shared'
import type { PlanningCategory, PlanningEvent, Quest } from '../../generated/prisma/client.js'

export type PlanningEventWithQuest = PlanningEvent & {
  quest: Quest | null
  planningCategory: PlanningCategory
}

export function toPlanningEventDto(event: PlanningEventWithQuest): PlanningEventDto {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    notes: event.notes,
    category: {
      id: event.planningCategory.id,
      name: event.planningCategory.name,
      color: event.planningCategory.color,
      icon: event.planningCategory.icon,
    },
    priority: event.priority,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    status: event.status as PlanningEventStatus,
    questId: event.questId,
    quest: event.quest
      ? {
          id: event.quest.id,
          title: event.quest.title,
          status: event.quest.status,
          difficulty: event.quest.difficulty,
        }
      : null,
    reminderMinutes: event.reminderMinutes,
    createdAt: event.createdAt.toISOString(),
  }
}
