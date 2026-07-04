import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  XP_BY_DIFFICULTY,
  type Difficulty,
  type Priority,
  type QuestCategory,
  type QuestDto,
} from '@one-mission/shared'
import { motion } from 'framer-motion'
import { Check, Clock, Pencil, Trash2, Zap } from 'lucide-react'
import { Badge, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDayFr, relativeDay } from '@/lib/dates'

const priorityDot: Record<Priority, string> = {
  LOW: 'bg-faint',
  MEDIUM: 'bg-warning',
  HIGH: 'bg-accent',
  URGENT: 'bg-danger',
}

interface QuestCardProps {
  quest: QuestDto
  onToggle: (quest: QuestDto) => void
  onEdit: (quest: QuestDto) => void
  onDelete: (quest: QuestDto) => void
  disabled?: boolean
}

export function QuestCard({ quest, onToggle, onEdit, onDelete, disabled }: QuestCardProps) {
  const done = quest.status === 'DONE'
  const overdue = !done && relativeDay(quest.dueDate) === 'past'
  const xp = XP_BY_DIFFICULTY[quest.difficulty as Difficulty] ?? 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'group flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors',
        'hover:border-line-strong',
        done && 'opacity-60',
      )}
    >
      {/* Case de complétion */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        disabled={disabled}
        onClick={() => onToggle(quest)}
        aria-label={done ? 'Décocher la quête' : 'Terminer la quête'}
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          done
            ? 'border-accent bg-accent text-on-accent'
            : 'border-line-strong hover:border-accent hover:bg-accent-soft',
        )}
      >
        {done && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <Check size={14} strokeWidth={3.5} />
          </motion.span>
        )}
      </motion.button>

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', done && 'line-through')}>{quest.title}</p>
        {quest.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{quest.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="accent">
            <Zap size={11} fill="currentColor" /> {xp} XP
          </Badge>
          <Badge variant="neutral">{CATEGORY_LABELS[quest.category as QuestCategory]}</Badge>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className={cn('size-1.5 rounded-full', priorityDot[quest.priority as Priority])} />
            {PRIORITY_LABELS[quest.priority as Priority]}
          </span>
          <span className={cn('inline-flex items-center gap-1', overdue ? 'font-medium text-danger' : 'text-faint')}>
            <Clock size={12} />
            {formatDayFr(quest.dueDate)}
            {quest.dueTime && ` · ${quest.dueTime}`}
            {overdue && ' · en retard'}
          </span>
        </div>

        {!done && quest.progress > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            <ProgressBar value={quest.progress} size="sm" className="max-w-40" />
            <span className="text-xs text-muted">{quest.progress}%</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
        <button
          onClick={() => onEdit(quest)}
          aria-label="Modifier"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => onDelete(quest)}
          aria-label="Supprimer"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  )
}
