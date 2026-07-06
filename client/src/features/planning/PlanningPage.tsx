import {
  CATEGORY_LABELS,
  type PlanningEventDto,
  type QuestCategory,
} from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { planningApi } from '@/api/planning'
import { Button, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { applyXpResult } from '@/stores/xpFx'
import { EventModal } from './EventModal'
import { WeekGrid } from './WeekGrid'
import {
  addDays,
  addMinutes,
  formatMinutes,
  formatWeekRange,
  startOfWeek,
  toDateInput,
} from './time'

type ModalState = { slot?: { start: Date; end: Date }; event?: PlanningEventDto } | null

export function PlanningPage() {
  const queryClient = useQueryClient()
  // La semaine affichée par défaut est toujours la semaine en cours : dès qu'une
  // semaine se termine, le calendrier « bascule » naturellement sur la suivante.
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [fineGrid, setFineGrid] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const weekKey = toDateInput(weekStart)
  const from = weekStart.toISOString()
  const to = addDays(weekStart, 7).toISOString()
  const hourHeight = fineGrid ? 96 : 56

  const eventsQuery = useQuery({
    queryKey: ['planning', weekKey],
    queryFn: () => planningApi.list(from, to),
  })
  const statsQuery = useQuery({
    queryKey: ['planning-stats', weekKey],
    queryFn: () => planningApi.stats(from, to),
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['planning'] })
    void queryClient.invalidateQueries({ queryKey: ['planning-stats'] })
  }

  // Déplacement / redimensionnement : mise à jour optimiste pour un rendu fluide.
  const move = useMutation({
    mutationFn: ({ event, start, end }: { event: PlanningEventDto; start: Date; end: Date }) =>
      planningApi.update(event.id, { startAt: start.toISOString(), endAt: end.toISOString() }),
    onMutate: async ({ event, start, end }) => {
      await queryClient.cancelQueries({ queryKey: ['planning', weekKey] })
      const previous = queryClient.getQueryData<{ events: PlanningEventDto[] }>([
        'planning',
        weekKey,
      ])
      queryClient.setQueryData<{ events: PlanningEventDto[] }>(['planning', weekKey], (old) =>
        old
          ? {
              events: old.events.map((e) =>
                e.id === event.id
                  ? { ...e, startAt: start.toISOString(), endAt: end.toISOString() }
                  : e,
              ),
            }
          : old,
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['planning', weekKey], ctx.previous)
    },
    onSettled: invalidate,
  })

  const toggleDone = useMutation({
    mutationFn: (event: PlanningEventDto) =>
      event.status === 'DONE' ? planningApi.uncomplete(event.id) : planningApi.complete(event.id),
    onSuccess: (result) => {
      applyXpResult(result.xp)
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['quests'] })
    },
  })

  function openCreateDefault() {
    const today = new Date()
    const base = startOfWeek(today).getTime() === weekStart.getTime() ? today : weekStart
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0)
    setModal({ slot: { start, end: addMinutes(start, 60) } })
  }

  const stats = statsQuery.data?.stats

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planning</h1>
          <p className="mt-1 text-sm text-muted">
            Organise tes semaines heure par heure et suis ce que tu accomplis vraiment.
          </p>
        </div>
        <Button onClick={openCreateDefault}>
          <Plus size={16} /> Nouvel événement
        </Button>
      </div>

      {/* Statistiques de la semaine affichée */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Heures planifiées" value={stats ? formatMinutes(stats.plannedMinutes) : '—'} />
        <StatTile label="Heures effectuées" value={stats ? formatMinutes(stats.doneMinutes) : '—'} />
        <StatTile
          label="Respect du planning"
          value={stats ? `${stats.adherenceRate} %` : '—'}
          hint={stats ? `${stats.eventsDone}/${stats.eventsCount} événements effectués` : undefined}
        />
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <p className="text-xs font-medium text-muted">Par catégorie</p>
          {stats && stats.categories.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1.5">
              {stats.categories.slice(0, 3).map((c) => (
                <div key={c.category} className="flex items-center gap-2">
                  <span className="w-16 truncate text-[11px] text-muted">
                    {CATEGORY_LABELS[c.category as QuestCategory] ?? c.category}
                  </span>
                  <span
                    className="relative h-1.5 flex-1 overflow-hidden rounded-full"
                    style={{ background: 'var(--chart-muted)' }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: 'var(--chart-1)',
                        width: `${c.plannedMinutes > 0 ? Math.round((c.doneMinutes / c.plannedMinutes) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <span className="text-[11px] text-faint tabular-nums">
                    {formatMinutes(c.plannedMinutes)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-faint">Aucun événement cette semaine</p>
          )}
        </div>
      </div>

      {/* Navigation entre les semaines */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Semaine précédente"
          >
            <ChevronLeft size={16} />
          </button>
          {/* Affiche la période de la semaine sélectionnée ; le clic recentre sur la semaine en cours. */}
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            title="Revenir à la semaine en cours"
            className="rounded-lg px-2.5 py-1 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-accent"
          >
            {formatWeekRange(weekStart)}
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Semaine suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-medium">
          {([false, true] as const).map((fine) => (
            <button
              key={String(fine)}
              onClick={() => setFineGrid(fine)}
              className={cn(
                'rounded-lg px-2.5 py-1 transition-colors',
                fineGrid === fine ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink',
              )}
            >
              {fine ? '30 min' : '1 h'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendrier */}
      <div className="mt-4 flex h-[calc(100dvh-19rem)] min-h-[480px] flex-col">
        {eventsQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-line bg-surface">
            <Spinner className="text-accent" />
          </div>
        ) : (
          <WeekGrid
            weekStart={weekStart}
            events={eventsQuery.data?.events ?? []}
            hourHeight={hourHeight}
            showHalfHours={fineGrid}
            onCreateSlot={(start, end) => setModal({ slot: { start, end } })}
            onEventClick={(event) => setModal({ event })}
            onEventMove={(event, start, end) => move.mutate({ event, start, end })}
            onToggleDone={(event) => toggleDone.mutate(event)}
          />
        )}
      </div>

      <EventModal
        open={modal !== null}
        onClose={() => setModal(null)}
        slot={modal?.slot ?? null}
        event={modal?.event}
      />
    </div>
  )
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-faint">{hint}</p>}
    </div>
  )
}
