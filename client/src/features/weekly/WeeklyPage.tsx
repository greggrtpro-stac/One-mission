import {
  XP_BY_DIFFICULTY,
  type Difficulty,
  type WeeklyQuestDto,
} from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, Reorder, useDragControls } from 'framer-motion'
import { CalendarCheck, Check, GripVertical, Pencil, Plus, RotateCcw, Trash2, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { weeklyApi } from '@/api/weekly'
import { Badge, Button, Card, ProgressBar, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { applyXpResult } from '@/stores/xpFx'
import { WeeklyFormModal } from './WeeklyFormModal'

function WeeklyItem({
  quest,
  onToggle,
  onEdit,
  onDelete,
  disabled,
}: {
  quest: WeeklyQuestDto
  onToggle: (q: WeeklyQuestDto) => void
  onEdit: (q: WeeklyQuestDto) => void
  onDelete: (q: WeeklyQuestDto) => void
  disabled?: boolean
}) {
  const controls = useDragControls()
  const done = Boolean(quest.completedAt)
  const xp = XP_BY_DIFFICULTY[quest.difficulty as Difficulty] ?? 0

  return (
    <Reorder.Item
      value={quest}
      dragListener={false}
      dragControls={controls}
      className={cn(
        'group flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-3.5',
        'transition-colors hover:border-line-strong',
        done && 'opacity-60',
      )}
    >
      <button
        onPointerDown={(e) => controls.start(e)}
        aria-label="Réorganiser"
        className="cursor-grab touch-none rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-muted active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>

      <motion.button
        whileTap={{ scale: 0.85 }}
        disabled={disabled}
        onClick={() => onToggle(quest)}
        aria-label={done ? 'Décocher' : 'Terminer'}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          done
            ? 'border-accent bg-accent text-on-accent'
            : 'border-line-strong hover:border-accent hover:bg-accent-soft',
        )}
      >
        {done && <Check size={14} strokeWidth={3.5} />}
      </motion.button>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', done && 'line-through')}>{quest.title}</p>
        {quest.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{quest.description}</p>
        )}
      </div>

      <Badge variant="accent" className="shrink-0">
        <Zap size={11} fill="currentColor" /> {xp} XP
      </Badge>
      {quest.totalCompletions > 0 && (
        <Badge variant="neutral" className="shrink-0" title="Semaines complétées au total">
          ×{quest.totalCompletions}
        </Badge>
      )}

      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
        <button
          onClick={() => onEdit(quest)}
          aria-label="Modifier"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(quest)}
          aria-label="Supprimer"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Reorder.Item>
  )
}

export function WeeklyPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WeeklyQuestDto | undefined>(undefined)
  const [items, setItems] = useState<WeeklyQuestDto[]>([])
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const query = useQuery({ queryKey: ['weekly-quests'], queryFn: weeklyApi.list })

  // Copie locale pour le drag & drop fluide.
  useEffect(() => {
    if (query.data) setItems(query.data.weeklyQuests)
  }, [query.data])

  const toggle = useMutation({
    mutationFn: (q: WeeklyQuestDto) =>
      q.completedAt ? weeklyApi.uncomplete(q.id) : weeklyApi.complete(q.id),
    onSuccess: (result) => {
      applyXpResult(result.xp)
      void queryClient.invalidateQueries({ queryKey: ['weekly-quests'] })
    },
  })

  const remove = useMutation({
    mutationFn: (q: WeeklyQuestDto) => weeklyApi.remove(q.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['weekly-quests'] }),
  })

  function handleReorder(next: WeeklyQuestDto[]) {
    setItems(next)
    if (reorderTimer.current) clearTimeout(reorderTimer.current)
    reorderTimer.current = setTimeout(() => {
      void weeklyApi
        .reorder(next.map((q) => q.id))
        .then(() => queryClient.invalidateQueries({ queryKey: ['weekly-quests'] }))
    }, 600)
  }

  function handleDelete(q: WeeklyQuestDto) {
    if (window.confirm(`Supprimer « ${q.title} » ? Son historique (×${q.totalCompletions}) sera perdu.`)) {
      remove.mutate(q)
    }
  }

  const doneCount = items.filter((q) => q.completedAt).length
  const percent = items.length > 0 ? (doneCount / items.length) * 100 : 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quêtes hebdomadaires</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <RotateCcw size={13} /> Réinitialisées automatiquement chaque lundi.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus size={16} /> Nouvelle quête hebdo
        </Button>
      </div>

      {items.length > 0 && (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium">Cette semaine</p>
            <p className="text-muted">
              <span className="font-bold text-accent">{doneCount}</span>/{items.length} terminées
            </p>
          </div>
          <ProgressBar value={percent} className="mt-3" />
        </Card>
      )}

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <CalendarCheck size={24} />
          </span>
          <p className="font-semibold">Aucune quête hebdomadaire</p>
          <p className="max-w-sm text-sm text-muted">
            Crée tes rituels de la semaine : ils reviendront automatiquement chaque lundi.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus size={14} /> Créer ma première quête hebdo
          </Button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="mt-4 flex flex-col gap-2"
        >
          {items.map((q) => (
            <WeeklyItem
              key={q.id}
              quest={q}
              onToggle={(quest) => toggle.mutate(quest)}
              onEdit={(quest) => {
                setEditing(quest)
                setFormOpen(true)
              }}
              onDelete={handleDelete}
              disabled={toggle.isPending}
            />
          ))}
        </Reorder.Group>
      )}

      <WeeklyFormModal open={formOpen} onClose={() => setFormOpen(false)} weeklyQuest={editing} />
    </div>
  )
}
