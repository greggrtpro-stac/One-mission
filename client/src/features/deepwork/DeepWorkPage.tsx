import type { DeepWorkSessionDto } from '@one-mission/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pause, Play, RotateCcw, Settings2, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { deepworkApi } from '@/api/deepwork'
import { Badge, Button, Card, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { PHASE_LABELS, phaseDurationMs, useDeepWorkStore } from '@/stores/deepwork'
import { DeepWorkSettingsModal } from './DeepWorkSettingsModal'
import { TimerRing } from './TimerRing'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 1 505 000 ms → "25:05" (ou "1:02:00" au-delà d'une heure). */
function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** 5 400 s → "1 h 30" ; 2 700 s → "45 min". */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${pad(m)}`
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </Card>
  )
}

/** Barres du temps de focus des 7 derniers jours (une seule série : pas de légende). */
function WeekChart({ sessions }: { sessions: DeepWorkSessionDto[] }) {
  const days = useMemo(() => {
    const now = new Date()
    const out = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i))
      return {
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        full: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        seconds: 0,
      }
    })
    const index = new Map(out.map((d, i) => [d.key, i]))
    for (const s of sessions) {
      if (s.kind !== 'FOCUS') continue
      const d = new Date(s.startedAt)
      const i = index.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      if (i !== undefined) out[i]!.seconds += s.duration
    }
    return out
  }, [sessions])

  const max = Math.max(...days.map((d) => d.seconds))

  return (
    <div>
      <div className="flex h-28 items-end gap-2">
        {days.map((d) => (
          <div
            key={d.key}
            className="group relative flex h-full flex-1 flex-col items-center justify-end"
            title={`${d.full} — ${d.seconds > 0 ? formatDuration(d.seconds) : 'aucun focus'}`}
          >
            {d.seconds === max && max > 0 && (
              <p className="mb-1 text-[11px] font-semibold text-muted tabular-nums">
                {formatDuration(d.seconds)}
              </p>
            )}
            <div
              className="w-full max-w-8 rounded-t"
              style={{
                height: max > 0 && d.seconds > 0 ? `${Math.max(6, (d.seconds / max) * 100)}%` : 4,
                background: d.seconds > 0 ? 'var(--chart-1)' : 'var(--chart-muted)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {days.map((d) => (
          <p key={d.key} className="flex-1 text-center text-[11px] text-faint">
            {d.label}
          </p>
        ))}
      </div>
    </div>
  )
}

export function DeepWorkPage() {
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const store = useDeepWorkStore()
  const { phase, status, endsAt, remainingMs, cycle, settings } = store

  const statsQuery = useQuery({ queryKey: ['deepwork', 'stats'], queryFn: deepworkApi.stats })
  const sessionsQuery = useQuery({
    queryKey: ['deepwork', 'sessions'],
    queryFn: deepworkApi.sessions,
  })

  // Les réglages serveur font foi (synchro entre appareils).
  const serverSettings = statsQuery.data?.settings
  useEffect(() => {
    if (serverSettings) useDeepWorkStore.getState().applySettings(serverSettings)
  }, [serverSettings])

  useEffect(() => {
    if (status !== 'running') return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(interval)
  }, [status])

  const planned = phaseDurationMs(phase, settings)
  const remaining = status === 'running' && endsAt ? Math.max(0, endsAt - now) : remainingMs
  const progress = planned > 0 ? 1 - remaining / planned : 0
  const isBreak = phase !== 'FOCUS'

  function handleSkip() {
    const record = useDeepWorkStore.getState().skipPhase()
    if (record) {
      void deepworkApi.recordSession(record).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['deepwork'] })
      })
    }
  }

  const stats = statsQuery.data
  const sessions = sessionsQuery.data?.sessions ?? []
  const cycleDots = Array.from({ length: settings.cyclesBeforeLongBreak }, (_, i) => i)
  const doneInCycle = cycle % settings.cyclesBeforeLongBreak

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DeepWork</h1>
          <p className="mt-1 text-sm text-muted">
            Sessions de focus profond, façon Pomodoro : {settings.focusMinutes} min de focus,
            pauses automatiques.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
          <Settings2 size={16} /> Réglages
        </Button>
      </div>

      <Card className="mt-6 flex flex-col items-center gap-6 p-8">
        <TimerRing
          progress={progress}
          timeLabel={formatClock(remaining)}
          phaseLabel={PHASE_LABELS[phase]}
          isBreak={isBreak}
        />

        <div className="flex items-center gap-2" title="Focus terminés avant la pause longue">
          {cycleDots.map((i) => (
            <span
              key={i}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                i < doneInCycle ? 'bg-accent' : 'bg-surface-3',
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => useDeepWorkStore.getState().reset()} title="Réinitialiser la phase">
            <RotateCcw size={18} />
          </Button>
          {status === 'running' ? (
            <Button size="lg" onClick={() => useDeepWorkStore.getState().pause()}>
              <Pause size={18} /> Pause
            </Button>
          ) : (
            <Button size="lg" onClick={() => useDeepWorkStore.getState().start()}>
              <Play size={18} /> {status === 'paused' ? 'Reprendre' : 'Démarrer'}
            </Button>
          )}
          <Button variant="ghost" onClick={handleSkip} title="Passer à la phase suivante">
            <SkipForward size={18} />
          </Button>
        </div>
      </Card>

      {statsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-accent" />
        </div>
      ) : stats ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Aujourd'hui" value={formatDuration(stats.todaySeconds)} />
          <StatTile label="Cette semaine" value={formatDuration(stats.weekSeconds)} />
          <StatTile label="Ce mois-ci" value={formatDuration(stats.monthSeconds)} />
          <StatTile label="Au total" value={formatDuration(stats.totalSeconds)} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold">Focus des 7 derniers jours</p>
          <div className="mt-4">
            <WeekChart sessions={sessions} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold">Sessions récentes</p>
          {sessions.filter((s) => s.kind === 'FOCUS').length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Aucune session pour l'instant : lance ton premier focus !
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {sessions
                .filter((s) => s.kind === 'FOCUS')
                .slice(0, 6)
                .map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm"
                  >
                    <span className="text-muted">
                      {new Date(s.startedAt).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      ·{' '}
                      {new Date(s.startedAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">
                        {formatDuration(s.duration)}
                      </span>
                      {s.completed ? (
                        <Badge variant="success">
                          <Check size={11} /> terminée
                        </Badge>
                      ) : (
                        <Badge variant="neutral">interrompue</Badge>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <DeepWorkSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
