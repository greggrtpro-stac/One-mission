import { CATEGORY_LABELS, type QuestCategory } from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import { BookOpenText, CalendarCheck, ShieldCheck, Swords, Timer, Zap } from 'lucide-react'
import { statsApi } from '@/api/stats'
import { Card, Spinner } from '@/components/ui'
import { formatDayFr } from '@/lib/dates'

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap
  label: string
  value: string
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
      </div>
    </Card>
  )
}

/** Barres quotidiennes sur 30 jours — une seule série, libellé direct sur le max. */
function DailyBars({
  points,
  formatValue,
}: {
  points: { date: string; value: number }[]
  formatValue: (v: number) => string
}) {
  const max = Math.max(...points.map((p) => p.value))
  return (
    <div>
      <div className="flex h-24 items-end gap-0.5">
        {points.map((p) => (
          <div
            key={p.date}
            className="group relative flex h-full flex-1 flex-col items-center justify-end"
            title={`${formatDayFr(p.date)} — ${p.value > 0 ? formatValue(p.value) : 'rien'}`}
          >
            {p.value === max && max > 0 && (
              <p className="mb-1 text-[10px] font-semibold whitespace-nowrap text-muted tabular-nums">
                {formatValue(p.value)}
              </p>
            )}
            <div
              className="w-full rounded-t-[3px]"
              style={{
                height: max > 0 && p.value > 0 ? `${Math.max(5, (p.value / max) * 100)}%` : 3,
                background: p.value > 0 ? 'var(--chart-1)' : 'var(--chart-muted)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-faint">
        <span>{formatDayFr(points[0]!.date)}</span>
        <span>{formatDayFr(points[Math.floor(points.length / 2)]!.date)}</span>
        <span>aujourd'hui</span>
      </div>
    </div>
  )
}

/** Répartition par catégorie : l'identité est portée par la ligne, pas la couleur. */
function CategoryBars({ categories }: { categories: { category: string; count: number }[] }) {
  if (categories.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Aucune quête terminée pour l'instant.</p>
  }
  const max = categories[0]!.count
  return (
    <div className="flex flex-col gap-2.5">
      {categories.map((c) => (
        <div key={c.category} className="grid grid-cols-[6rem,1fr,2.5rem] items-center gap-3">
          <p className="truncate text-sm text-muted">
            {CATEGORY_LABELS[c.category as QuestCategory] ?? c.category}
          </p>
          <div className="h-4 overflow-hidden rounded bg-surface-2">
            <div
              className="h-full rounded"
              style={{ width: `${(c.count / max) * 100}%`, background: 'var(--chart-1)' }}
            />
          </div>
          <p className="text-right text-sm font-semibold tabular-nums">{c.count}</p>
        </div>
      ))}
    </div>
  )
}

export function StatsPage() {
  const query = useQuery({ queryKey: ['stats'], queryFn: statsApi.overview })
  const data = query.data

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
      <p className="mt-1 text-sm text-muted">Ta progression sur les 30 derniers jours, et depuis le début.</p>

      {query.isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile icon={Swords} label="Quêtes terminées" value={String(data.totals.questsDone)} />
            <StatTile
              icon={CalendarCheck}
              label="Hebdos complétées"
              value={String(data.totals.weeklyCompletions)}
            />
            <StatTile icon={Timer} label="Focus total" value={formatHours(data.totals.focusSeconds)} />
            <StatTile
              icon={Zap}
              label="Sessions DeepWork"
              value={String(data.totals.deepworkSessions)}
            />
            <StatTile
              icon={BookOpenText}
              label="Entrées de journal"
              value={String(data.totals.journalEntries)}
            />
            <StatTile
              icon={ShieldCheck}
              label="Jours d'abstinence cumulés"
              value={`${data.totals.relapsesAvoidedDays} j`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="text-sm font-semibold">Quêtes terminées par jour</p>
              <div className="mt-4">
                <DailyBars
                  points={data.days.map((d) => ({ date: d.date, value: d.questsDone }))}
                  formatValue={(v) => `${v} quête${v > 1 ? 's' : ''}`}
                />
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-semibold">Temps de focus par jour</p>
              <div className="mt-4">
                <DailyBars
                  points={data.days.map((d) => ({ date: d.date, value: d.focusSeconds }))}
                  formatValue={formatHours}
                />
              </div>
            </Card>
          </div>

          <Card className="mt-4 p-5">
            <p className="text-sm font-semibold">Répartition des quêtes terminées par catégorie</p>
            <div className="mt-4">
              <CategoryBars categories={data.categories} />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
