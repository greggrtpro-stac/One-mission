import type { AddictionDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flame, Pencil, Plus, ShieldCheck, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { addictionsApi } from '@/api/deepwork'
import { Badge, Button, Card, Spinner } from '@/components/ui'
import { AddictionFormModal } from './AddictionFormModal'
import { RelapseModal } from './RelapseModal'
import { streakDays } from './streak'

/** Paliers symboliques mis en avant sur la carte. */
const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365]

function nextMilestone(days: number): number | null {
  return MILESTONES.find((m) => m > days) ?? null
}

function AddictionCard({
  addiction,
  onRelapse,
  onEdit,
  onDelete,
}: {
  addiction: AddictionDto
  onRelapse: (a: AddictionDto) => void
  onEdit: (a: AddictionDto) => void
  onDelete: (a: AddictionDto) => void
}) {
  const days = streakDays(addiction.startDate)
  const best = Math.max(addiction.bestStreak, days)
  const next = nextMilestone(days)

  return (
    <Card className="group flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-xl">
            {addiction.icon || <ShieldCheck size={22} className="text-accent" />}
          </span>
          <div>
            <p className="font-semibold">{addiction.name}</p>
            <p className="text-xs text-muted">
              depuis le{' '}
              {new Date(addiction.startDate).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
          <button
            onClick={() => onEdit(addiction)}
            aria-label="Modifier"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(addiction)}
            aria-label="Supprimer"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-4xl font-bold text-accent tabular-nums">{days}</p>
        <p className="text-sm font-medium text-muted">jour{days > 1 ? 's' : ''} sans craquer</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="accent" title="Meilleure série">
          <Trophy size={11} /> record : {best} j
        </Badge>
        {addiction.relapseCount > 0 && (
          <Badge variant="neutral" title="Rechutes déclarées">
            {addiction.relapseCount} rechute{addiction.relapseCount > 1 ? 's' : ''}
          </Badge>
        )}
        {next !== null && (
          <Badge variant="outline" title="Prochain palier">
            <Flame size={11} /> prochain palier : {next} j
          </Badge>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <Button variant="outline" size="sm" className="w-full" onClick={() => onRelapse(addiction)}>
          J'ai rechuté
        </Button>
      </div>
    </Card>
  )
}

export function AddictionsPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AddictionDto | undefined>(undefined)
  const [relapsing, setRelapsing] = useState<AddictionDto | null>(null)

  const query = useQuery({ queryKey: ['addictions'], queryFn: addictionsApi.list })

  const remove = useMutation({
    mutationFn: (a: AddictionDto) => addictionsApi.remove(a.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['addictions'] }),
  })

  function handleDelete(a: AddictionDto) {
    if (window.confirm(`Supprimer « ${a.name} » ? Tout son historique sera perdu.`)) {
      remove.mutate(a)
    }
  }

  const addictions = query.data?.addictions ?? []

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Addictions</h1>
          <p className="mt-1 text-sm text-muted">
            Chaque jour sans craquer allonge ta série. La rechute fait partie du chemin : on la
            note, on comprend, on repart.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus size={16} /> Nouvelle addiction
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : addictions.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <ShieldCheck size={24} />
          </span>
          <p className="font-semibold">Aucune addiction suivie</p>
          <p className="max-w-sm text-sm text-muted">
            Choisis un démon à affronter — écrans, sucre, cigarette… — et regarde ta série de jours
            sans craquer grandir.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus size={14} /> Suivre ma première addiction
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addictions.map((a) => (
            <AddictionCard
              key={a.id}
              addiction={a}
              onRelapse={setRelapsing}
              onEdit={(addiction) => {
                setEditing(addiction)
                setFormOpen(true)
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddictionFormModal open={formOpen} onClose={() => setFormOpen(false)} addiction={editing} />
      <RelapseModal addiction={relapsing} onClose={() => setRelapsing(null)} />
    </div>
  )
}
