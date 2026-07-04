import type { MainQuestDto, MainQuestMilestone, QuestDto } from '@one-mission/shared'
import type { MainQuest, Quest } from '../../generated/prisma/client.js'

export function toQuestDto(quest: Quest): QuestDto {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    category: quest.category,
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
