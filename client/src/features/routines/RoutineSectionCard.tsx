import {
  ROUTINE_DAYS,
  ROUTINE_DAY_SHORT,
  type RoutineDay,
  type RoutineSectionDto,
  type RoutineTaskDto,
} from '@one-mission/shared'
import { motion, Reorder, useDragControls } from 'framer-motion'
import { Check, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { todayIndex } from './time'

/** Grille de colonnes commune à l'en-tête et à chaque ligne de tâche. */
const GRID_COLS = 'grid-cols-[minmax(9rem,1fr)_repeat(7,minmax(2.75rem,2.75rem))]'

function DayCheckbox({
  checked,
  disabled,
  onClick,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={checked}
      className={cn(
        'mx-auto flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
        checked
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line-strong hover:border-accent hover:bg-accent-soft',
      )}
    >
      {checked && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
          <Check size={13} strokeWidth={3.5} />
        </motion.span>
      )}
    </motion.button>
  )
}

function TaskRow({
  task,
  onToggleDay,
  onEdit,
  onDelete,
  disabled,
}: {
  task: RoutineTaskDto
  onToggleDay: (task: RoutineTaskDto, day: RoutineDay) => void
  onEdit: (task: RoutineTaskDto) => void
  onDelete: (task: RoutineTaskDto) => void
  disabled?: boolean
}) {
  const controls = useDragControls()
  const today = todayIndex()

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      className={cn(
        'group grid items-center gap-1 rounded-xl border border-line bg-surface px-2 py-2',
        'transition-colors hover:border-line-strong',
        GRID_COLS,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          onPointerDown={(e) => controls.start(e)}
          aria-label="Réorganiser"
          className="cursor-grab touch-none rounded-lg p-1 text-faint transition-colors hover:bg-surface-2 hover:text-muted active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</p>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
          <button
            onClick={() => onEdit(task)}
            aria-label="Modifier la tâche"
            className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(task)}
            aria-label="Supprimer la tâche"
            className="rounded-lg p-1 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {ROUTINE_DAYS.map((day, i) => (
        <DayCheckbox
          key={day}
          checked={task.checked[day]}
          disabled={disabled}
          onClick={() => onToggleDay(task, day)}
          label={`${task.title} — ${ROUTINE_DAY_SHORT[day]}${i === today ? " (aujourd'hui)" : ''}`}
        />
      ))}
    </Reorder.Item>
  )
}

interface RoutineSectionCardProps {
  section: RoutineSectionDto
  onToggleDay: (task: RoutineTaskDto, day: RoutineDay) => void
  onReorder: (tasks: RoutineTaskDto[]) => void
  onEdit: (task: RoutineTaskDto) => void
  onDelete: (task: RoutineTaskDto) => void
  onAddTask: () => void
  disabled?: boolean
}

export function RoutineSectionCard({
  section,
  onToggleDay,
  onReorder,
  onEdit,
  onDelete,
  onAddTask,
  disabled,
}: RoutineSectionCardProps) {
  const today = todayIndex()

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        {section.icon && <span className="text-lg leading-none">{section.icon}</span>}
        {section.title}
      </h2>

      {section.tasks.length === 0 ? (
        <SectionEmptyState icon={section.icon} onAddTask={onAddTask} />
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[34rem]">
              {/* En-tête des jours */}
              <div className={cn('grid items-center gap-1 px-2 pb-2', GRID_COLS)}>
                <span />
                {ROUTINE_DAYS.map((day, i) => (
                  <span
                    key={day}
                    className={cn(
                      'text-center text-[11px] font-semibold',
                      i === today ? 'text-accent' : 'text-faint',
                    )}
                  >
                    {ROUTINE_DAY_SHORT[day]}
                  </span>
                ))}
              </div>

              <Reorder.Group
                axis="y"
                values={section.tasks}
                onReorder={onReorder}
                className="flex flex-col gap-1.5"
              >
                {section.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleDay={onToggleDay}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    disabled={disabled}
                  />
                ))}
              </Reorder.Group>
            </div>
          </div>

          <button
            onClick={onAddTask}
            className="mt-3 flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-accent"
          >
            <Plus size={15} /> Ajouter une tâche
          </button>
        </>
      )}
    </Card>
  )
}

/**
 * État vide d'une section : remplace la grille tant qu'aucune tâche n'existe
 * (même trame visuelle que l'état vide des Quêtes — cadre pointillé, pastille
 * accent, bouton principal). Monté/démonté par le rendu conditionnel ci-dessus,
 * il disparaît dès la première tâche créée et réapparaît si toutes sont
 * supprimées, sans rechargement.
 */
function SectionEmptyState({ icon, onAddTask }: { icon: string | null; onAddTask: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mt-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-6 py-10 text-center"
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-3xl leading-none"
      >
        {icon ?? '✨'}
      </span>
      <p className="font-semibold">Aucune tâche</p>
      <p className="max-w-sm text-sm text-muted">
        Commencez à créer votre routine en ajoutant votre première tâche.
      </p>
      <Button onClick={onAddTask} className="mt-1">
        <Plus size={16} /> Ajouter une tâche
      </Button>
    </motion.div>
  )
}
