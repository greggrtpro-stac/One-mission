import {
  ROUTINE_DAYS,
  type RoutineDay,
  type RoutineOverviewResponse,
  type RoutineSectionDto,
} from '@one-mission/shared'
import type { RoutineTask } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { currentWeekStart } from '../../utils/week.js'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Sections par défaut, créées une seule fois au premier accès (voir
 * ensureDefaultSections). VOLONTAIREMENT sans aucune tâche : comme pour les
 * Quêtes, chaque utilisateur construit sa routine lui-même. Le garde
 * « count > 0 » ci-dessous protège les comptes existants : leurs sections et
 * tâches déjà en base ne sont jamais touchées.
 */
const DEFAULT_SECTIONS = [
  { title: 'Morning Routine', icon: '🌅' },
  { title: 'Night Routine', icon: '🌙' },
]

function dayIndex(day: RoutineDay): number {
  return ROUTINE_DAYS.indexOf(day)
}

async function ensureDefaultSections(userId: string): Promise<void> {
  const existing = await prisma.routineSection.count({ where: { userId } })
  if (existing > 0) return

  await prisma.routineSection.createMany({
    data: DEFAULT_SECTIONS.map((def, i) => ({
      userId,
      title: def.title,
      icon: def.icon,
      sortOrder: i,
    })),
  })
}

/**
 * Série de semaines consécutives (hors semaine en cours, pas encore
 * terminée) où au moins 80 % de la routine a été réalisée. Calculée à la
 * volée à partir de l'historique des coches — pas de compteur dénormalisé à
 * synchroniser, pas de tâche planifiée requise.
 *
 * Simplification assumée : la progression de chaque semaine passée est
 * évaluée avec le NOMBRE ACTUEL de tâches (pas un instantané historique). Si
 * l'utilisateur supprime des tâches, les semaines passées sont recalculées
 * avec le nombre de tâches restant.
 */
async function computeStreak(userId: string, weekStart: Date): Promise<number> {
  const [taskCount, earliestTask] = await Promise.all([
    prisma.routineTask.count({ where: { userId } }),
    prisma.routineTask.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ])
  if (taskCount === 0 || !earliestTask) return 0

  const totalPerWeek = taskCount * 7
  const earliestWeekStart = currentWeekStart(earliestTask.createdAt)
  if (earliestWeekStart >= weekStart) return 0

  const grouped = await prisma.routineCheck.groupBy({
    by: ['weekStart'],
    where: { userId, weekStart: { lt: weekStart, gte: earliestWeekStart } },
    _count: { _all: true },
  })
  const countByWeek = new Map(grouped.map((g) => [g.weekStart.getTime(), g._count._all]))

  let streak = 0
  let cursor = new Date(weekStart.getTime() - 7 * DAY_MS)
  while (cursor.getTime() >= earliestWeekStart.getTime()) {
    const count = countByWeek.get(cursor.getTime()) ?? 0
    if (count / totalPerWeek < 0.8) break
    streak++
    cursor = new Date(cursor.getTime() - 7 * DAY_MS)
  }
  return streak
}

export async function getOverview(userId: string): Promise<RoutineOverviewResponse> {
  await ensureDefaultSections(userId)
  const weekStart = currentWeekStart()

  const [sections, checks, currentStreak] = await Promise.all([
    prisma.routineSection.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.routineCheck.findMany({
      where: { userId, weekStart },
      select: { taskId: true, dayOfWeek: true },
    }),
    computeStreak(userId, weekStart),
  ])

  const checkedByTask = new Map<string, Set<number>>()
  for (const c of checks) {
    if (!checkedByTask.has(c.taskId)) checkedByTask.set(c.taskId, new Set())
    checkedByTask.get(c.taskId)!.add(c.dayOfWeek)
  }

  let totalCount = 0
  let checkedCount = 0
  const sectionDtos: RoutineSectionDto[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    sortOrder: s.sortOrder,
    tasks: s.tasks.map((t) => {
      const checkedDays = checkedByTask.get(t.id) ?? new Set<number>()
      const checked = Object.fromEntries(
        ROUTINE_DAYS.map((d, i) => [d, checkedDays.has(i)]),
      ) as Record<RoutineDay, boolean>
      totalCount += ROUTINE_DAYS.length
      checkedCount += checkedDays.size
      return { id: t.id, title: t.title, sortOrder: t.sortOrder, checked }
    }),
  }))

  return {
    sections: sectionDtos,
    stats: {
      weekStart: weekStart.toISOString().slice(0, 10),
      checkedCount,
      totalCount,
      percent: totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0,
      currentStreak,
    },
  }
}

// ── Ownership ────────────────────────────────────────────────

async function getOwnedSection(userId: string, sectionId: string) {
  const section = await prisma.routineSection.findFirst({ where: { id: sectionId, userId } })
  if (!section) throw new ApiError(404, 'Section introuvable')
  return section
}

async function getOwnedTask(userId: string, taskId: string): Promise<RoutineTask> {
  const task = await prisma.routineTask.findFirst({ where: { id: taskId, userId } })
  if (!task) throw new ApiError(404, 'Tâche introuvable')
  return task
}

// ── Tâches ───────────────────────────────────────────────────

export async function createTask(userId: string, sectionId: string, title: string) {
  await getOwnedSection(userId, sectionId)
  const max = await prisma.routineTask.aggregate({
    where: { sectionId },
    _max: { sortOrder: true },
  })
  return prisma.routineTask.create({
    data: { userId, sectionId, title, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  })
}

export async function updateTask(userId: string, taskId: string, title: string) {
  await getOwnedTask(userId, taskId)
  return prisma.routineTask.update({ where: { id: taskId }, data: { title } })
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await getOwnedTask(userId, taskId)
  // Les coches de cette tâche disparaissent en cascade (onDelete: Cascade).
  await prisma.routineTask.delete({ where: { id: taskId } })
}

export async function reorderTasks(userId: string, sectionId: string, ids: string[]): Promise<void> {
  await getOwnedSection(userId, sectionId)
  const owned = await prisma.routineTask.findMany({
    where: { userId, sectionId },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((t) => t.id))
  const orderedIds = ids.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.routineTask.update({ where: { id }, data: { sortOrder: index } }),
    ),
  )
}

// ── Coches ───────────────────────────────────────────────────

export async function checkDay(userId: string, taskId: string, day: RoutineDay): Promise<void> {
  await getOwnedTask(userId, taskId)
  const weekStart = currentWeekStart()
  await prisma.routineCheck.upsert({
    where: { taskId_weekStart_dayOfWeek: { taskId, weekStart, dayOfWeek: dayIndex(day) } },
    create: { userId, taskId, weekStart, dayOfWeek: dayIndex(day) },
    update: {},
  })
}

export async function uncheckDay(userId: string, taskId: string, day: RoutineDay): Promise<void> {
  await getOwnedTask(userId, taskId)
  const weekStart = currentWeekStart()
  await prisma.routineCheck.deleteMany({
    where: { taskId, weekStart, dayOfWeek: dayIndex(day) },
  })
}

/**
 * Réinitialisation manuelle de la semaine en cours (bouton « Réinitialiser
 * cette semaine »). La réinitialisation automatique au changement de semaine
 * n'a besoin d'aucun code : une nouvelle semaine n'a simplement encore aucune
 * coche enregistrée (voir getOverview, scopé sur weekStart).
 */
export async function resetCurrentWeek(userId: string): Promise<void> {
  const weekStart = currentWeekStart()
  await prisma.routineCheck.deleteMany({ where: { userId, weekStart } })
}
