import type { MainQuestDto } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, Crosshair, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { mainQuestApi } from '@/api/quests'
import { Button, Card, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDayFr } from '@/lib/dates'
import { MainQuestFormModal } from './MainQuestFormModal'

interface MainQuestCardProps {
  mainQuest: MainQuestDto | null
  /** Version réduite pour le tableau de bord. */
  compact?: boolean
}

/** La quête principale : l'objectif majeur du moment, mis en avant partout. */
export function MainQuestCard({ mainQuest, compact = false }: MainQuestCardProps) {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleMilestone = useMutation({
    mutationFn: (milestoneId: string) => {
      if (!mainQuest) throw new Error('Aucune quête principale')
      const milestones = mainQuest.milestones.map((m) =>
        m.id === milestoneId ? { ...m, done: !m.done } : m,
      )
      const done = milestones.filter((m) => m.done).length
      const progress =
        milestones.length > 0 ? Math.round((done / milestones.length) * 100) : mainQuest.progress
      return mainQuestApi.patch({ milestones, progress })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['main-quest'] }),
  })

  const remove = useMutation({
    mutationFn: () => mainQuestApi.remove(),
    onSuccess: () => {
      setConfirmDelete(false)
      void queryClient.invalidateQueries({ queryKey: ['main-quest'] })
    },
  })

  if (!mainQuest) {
    return (
      <>
        <button
          onClick={() => setEditOpen(true)}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong p-8 text-center transition-colors hover:border-accent hover:bg-accent-soft/40"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Crosshair size={24} />
          </span>
          <span className="font-semibold">Définis ta quête principale</span>
          <span className="max-w-sm text-sm text-muted">
            L'objectif majeur qui guide toutes tes autres quêtes.
          </span>
        </button>
        <MainQuestFormModal open={editOpen} onClose={() => setEditOpen(false)} mainQuest={null} />
      </>
    )
  }

  return (
    <>
      <Card
        className="relative overflow-hidden border-accent/25 p-6"
        style={{
          background:
            'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 45%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--accent)' }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.18em] text-accent uppercase">
              <Crosshair size={13} /> Quête principale
            </p>
            <h2 className={cn('mt-2 font-bold tracking-tight', compact ? 'text-lg' : 'text-2xl')}>
              {mainQuest.title}
            </h2>
            {!compact && mainQuest.description && (
              <p className="mt-1.5 max-w-2xl text-sm text-muted">{mainQuest.description}</p>
            )}
            {mainQuest.targetDate && (
              <p className="mt-1.5 text-xs text-faint">
                Objectif : {formatDayFr(mainQuest.targetDate)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Modifier la quête principale"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Supprimer la quête principale"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="relative mt-5 flex items-center gap-3">
          <ProgressBar value={mainQuest.progress} size={compact ? 'md' : 'lg'} className="flex-1" />
          <span className="text-sm font-bold text-accent">{mainQuest.progress}%</span>
        </div>

        {!compact && mainQuest.milestones.length > 0 && (
          <ul className="relative mt-5 grid gap-2 sm:grid-cols-2">
            {mainQuest.milestones.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => toggleMilestone.mutate(m.id)}
                  disabled={toggleMilestone.isPending}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                    m.done
                      ? 'border-accent/30 bg-accent-soft text-muted line-through'
                      : 'border-line bg-surface hover:border-line-strong',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4.5 shrink-0 items-center justify-center rounded-full border-2',
                      m.done ? 'border-accent bg-accent text-on-accent' : 'border-line-strong',
                    )}
                  >
                    {m.done && <Check size={11} strokeWidth={3.5} />}
                  </span>
                  {m.title}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Confirmation de suppression */}
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface/95 p-6 text-center backdrop-blur-sm"
          >
            <p className="font-semibold">Supprimer ta quête principale ?</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
              <Button variant="danger" size="sm" loading={remove.isPending} onClick={() => remove.mutate()}>
                Supprimer
              </Button>
            </div>
          </motion.div>
        )}
      </Card>

      <MainQuestFormModal open={editOpen} onClose={() => setEditOpen(false)} mainQuest={mainQuest} />
    </>
  )
}
