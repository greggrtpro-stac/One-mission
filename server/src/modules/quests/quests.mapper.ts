import type { MainQuestDto, MainQuestMilestone, QuestCategoryRef, QuestDto } from '@one-mission/shared'
import type { MainQuest, Quest } from '../../generated/prisma/client.js'

/** Sélection de la catégorie embarquée dans chaque quête renvoyée à l'API. */
export const questCategoryRefSelect = {
  select: { id: true, name: true, color: true, icon: true },
} as const

export type QuestWithCategory = Quest & { questCategory: QuestCategoryRef }

export function toQuestDto(quest: QuestWithCategory): QuestDto {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    category: quest.questCategory,
    priority: quest.priority,
    difficulty: quest.difficulty,
    dueDate: quest.dueDate.toISOString().slice(0, 10),
    dueTime: quest.dueTime,
    status: quest.status,
    progress: quest.progress,
    xpAwarded: quest.xpAwarded,
    completedAt: quest.completedAt?.toISOString() ?? null,
    createdAt: quest.createdAt.toISOString(),
  }
}

export function toMainQuestDto(mq: MainQuest): MainQuestDto {
  return {
    id: mq.id,
    title: mq.title,
    description: mq.description,
    targetDate: mq.targetDate?.toISOString().slice(0, 10) ?? null,
    progress: mq.progress,
    milestones: Array.isArray(mq.milestones) ? (mq.milestones as unknown as MainQuestMilestone[]) : [],
    createdAt: mq.createdAt.toISOString(),
  }
}
