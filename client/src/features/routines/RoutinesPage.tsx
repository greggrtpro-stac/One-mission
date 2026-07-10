import type { RoutineDay, RoutineSectionDto, RoutineTaskDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckSquare, Flame, RotateCcw, Trash2, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { routinesApi } from '@/api/routines'
import { Button, Card, ConfirmDialog, Spinner } from '@/components/ui'
import { RoutineSectionCard } from './RoutineSectionCard'
import { RoutineTaskFormModal } from './RoutineTaskFormModal'
import { currentWeekStart, formatWeekRangeFr } from './time'

function StatTile({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: typeof Flame
  label: string
  value: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="flex items-center gap-3.5 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{label}</p>
          <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
      </Card>
    </motion.div>
  )
}

export function RoutinesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['routines'], queryFn: routinesApi.overview })

  // Copie locale : drag & drop fluide et cases qui réagissent sans attendre le réseau.
  const [sections, setSections] = useState<RoutineSectionDto[]>([])
  const [taskModal, setTaskModal] = useState<{ sectionId: string; task?: RoutineTaskDto } | null>(null)
  const reorderTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (query.data) setSections(query.data.sections)
  }, [query.data])

  const toggleDay = useMutation({
    mutationFn: ({ task, day }: { task: RoutineTaskDto; day: RoutineDay }) =>
      task.checked[day] ? routinesApi.uncheck(task.id, day) : routinesApi.check(task.id, day),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })

  const [toDelete, setToDelete] = useState<RoutineTaskDto | null>(null)
  const [confirmResetWeek, setConfirmResetWeek] = useState(false)

  const deleteTask = useMutation({
    mutationFn: (task: RoutineTaskDto) => routinesApi.deleteTask(task.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['routines'] })
      setToDelete(null)
    },
  })

  const resetWeek = useMutation({
    mutationFn: routinesApi.reset,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['routines'] })
      setConfirmResetWeek(false)
    },
  })

  function handleToggleDay(task: RoutineTaskDto, day: RoutineDay) {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === task.id ? { ...t, checked: { ...t.checked, [day]: !t.checked[day] } } : t,
        ),
      })),
    )
    toggleDay.mutate({ task, day })
  }

  function handleReorder(sectionId: string, tasks: RoutineTaskDto[]) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, tasks } : s)))
    clearTimeout(reorderTimers.current[sectionId])
    reorderTimers.current[sectionId] = setTimeout(() => {
      void routinesApi
        .reorderTasks(sectionId, tasks.map((t) => t.id))
        .then(() => queryClient.invalidateQueries({ queryKey: ['routines'] }))
    }, 600)
  }

  function handleDelete(task: RoutineTaskDto) {
    setToDelete(task)
  }

  function handleResetWeek() {
    setConfirmResetWeek(true)
  }

  // Dérivés localement (jamais en retard d'un aller-retour réseau) — seule la
  // série vient du serveur, elle ne peut pas se calculer sans tout l'historique.
  const totalCount = sections.reduce((sum, s) => sum + s.tasks.length * 7, 0)
  const checkedCount = sections.reduce(
    (sum, s) =>
      sum + s.tasks.reduce((c, t) => c + Object.values(t.checked).filter(Boolean).length, 0),
    0,
  )
  const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
  const streak = query.data?.stats.currentStreak ?? 0
  const weekStart = currentWeekStart()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Routine</h1>
          <p className="mt-1 text-sm text-muted">Semaine du {formatWeekRangeFr(weekStart)}</p>
        </div>
        {totalCount > 0 && (
          <Button
            variant="secondary"
            onClick={handleResetWeek}
            disabled={checkedCount === 0 || resetWeek.isPending}
            loading={resetWeek.isPending}
          >
            <RotateCcw size={16} /> Réinitialiser cette semaine
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatTile icon={TrendingUp} label="Progression de la semaine" value={`${percent} %`} index={0} />
            <StatTile
              icon={CheckSquare}
              label="Tâches réalisées"
              value={`${checkedCount} / ${totalCount}`}
              index={1}
            />
            <StatTile
              icon={Flame}
              label="Série actuelle"
              value={`${streak} semaine${streak > 1 ? 's' : ''}`}
              index={2}
            />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {sections.map((section) => (
              <RoutineSectionCard
                key={section.id}
                section={section}
                onToggleDay={handleToggleDay}
                onReorder={(tasks) => handleReorder(section.id, tasks)}
                onEdit={(task) => setTaskModal({ sectionId: section.id, task })}
                onDelete={handleDelete}
                onAddTask={() => setTaskModal({ sectionId: section.id })}
                disabled={toggleDay.isPending}
              />
            ))}
          </div>
        </>
      )}

      {taskModal && (
        <RoutineTaskFormModal
          open={taskModal !== null}
          onClose={() => setTaskModal(null)}
          sectionId={taskModal.sectionId}
          task={taskModal.task}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteTask.mutate(toDelete)}
        icon={Trash2}
        tone="danger"
        title="Supprimer cette tâche ?"
        description={
          <>
            <p>Cette tâche sera définitivement supprimée.</p>
            <p>Toutes les données associées disparaîtront.</p>
          </>
        }
        confirmLabel="Supprimer"
        loading={deleteTask.isPending}
      />

      <ConfirmDialog
        open={confirmResetWeek}
        onClose={() => setConfirmResetWeek(false)}
        onConfirm={() => resetWeek.mutate()}
        icon={RotateCcw}
        tone="warning"
        title="Réinitialiser cette semaine ?"
        description={
          <>
            <p>Toutes les cases cochées seront décochées.</p>
            <p>Les tâches resteront enregistrées.</p>
            <p>Votre série actuelle ne sera pas supprimée.</p>
          </>
        }
        confirmLabel="Réinitialiser"
        loading={resetWeek.isPending}
      />
    </div>
  )
}
