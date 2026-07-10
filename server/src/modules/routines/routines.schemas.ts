import { ROUTINE_DAYS } from '@one-mission/shared'
import { z } from 'zod'

export const routineDaySchema = z.enum(ROUTINE_DAYS)

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(120),
})

export const updateTaskSchema = createTaskSchema

export const reorderTasksSchema = z.object({
  ids: z.array(z.string()).max(200),
})

export const dayActionSchema = z.object({
  day: routineDaySchema,
})
