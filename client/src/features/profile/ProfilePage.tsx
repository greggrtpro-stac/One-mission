import {
  CATEGORY_LABELS,
  levelFromTotalXp,
  xpForLevel,
  type ProfileStats,
  type PublicUser,
  type QuestCategory,
} from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  CalendarCheck,
  CalendarDays,
  Flame,
  ListChecks,
  Medal,
  ShieldCheck,
  ShieldX,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { statsApi } from '@/api/stats'
import { Avatar, Badge, Card, ProgressBar, Spinner } from '@/components/ui'
import { FeatureGate } from '@/features/subscription/FeatureGate'
import { cn } from '@/lib/cn'
import { formatDayFr } from '@/lib/dates'
import { useAuthStore } from '@/stores/auth'
import { ACHIEVEMENTS } from './achievements'

// ── Formatage ────────────────────────────────────────────────

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

function formatXp(xp: number): string {
  return xp.toLocaleString('fr-FR')
}

// ── Briques d'affichage ──────────────────────────────────────

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

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

/** Infobulle des graphiques recharts, aux couleurs de l'app. */
function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean
  payload?: { value: number | string }[]
  label?: string
  format: (v: number) => string
}) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted">{formatDayFr(label)}</p>
      <p className="text-sm font-semibold tabular-nums">{format(Number(payload[0]!.value))}</p>
    </div>
  )
}

const axisTick = { fontSize: 10, fill: 'var(--faint)' }

/** Aire cumulée (XP totale) sur 30 jours. */
function XpAreaChart({ points }: { points: { date: string; xp: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={points} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDayFr}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          minTickGap={48}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => formatXp(v)}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<ChartTooltip format={(v) => `${formatXp(v)} XP`} />} />
        <Area
          type="monotone"
          dataKey="xp"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#xpFill)"
          activeDot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Niveau atteint jour par jour (paliers) sur 30 jours. */
function LevelStepChart({ points }: { points: { date: string; level: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={points} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDayFr}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          minTickGap={48}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={30}
          allowDecimals={false}
          domain={[(min: number) => Math.max(1, min - 1), (max: number) => max + 1]}
        />
        <Tooltip content={<ChartTooltip format={(v) => `Niveau ${v}`} />} />
        <Line
          type="stepAfter"
          dataKey="level"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Barres quotidiennes ou hebdomadaires — libellé direct sur le max uniquement. */
function Bars({
  points,
  formatValue,
  startLabel,
  endLabel,
}: {
  points: { key: string; label: string; value: number }[]
  formatValue: (v: number) => string
  startLabel: string
  endLabel: string
}) {
  const max = Math.max(...points.map((p) => p.value))
  return (
    <div>
      <div className="flex h-24 items-end gap-0.5">
        {points.map((p) => (
          <div
            key={p.key}
            className="group relative flex h-full flex-1 flex-col items-center justify-end"
            title={`${p.label} — ${p.value > 0 ? formatValue(p.value) : 'rien'}`}
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
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}

/** Une ligne par addiction : série en cours vs record, rechutes. */
function AddictionRows({ addictions }: { addictions: ProfileStats['addictions'] }) {
  if (addictions.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Aucune addiction suivie.</p>
  }
  const max = Math.max(...addictions.map((a) => a.bestDays), 1)
  return (
    <div className="flex flex-col gap-3">
      {addictions.map((a) => (
        <div key={a.name}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium">{a.name}</p>
            <p className="shrink-0 text-xs text-muted tabular-nums">
              {a.currentDays} j — record {a.bestDays} j · {a.relapseCount} rechute
              {a.relapseCount > 1 ? 's' : ''}
            </p>
          </div>
          <div
            className="mt-1.5 h-4 overflow-hidden rounded bg-surface-2"
            title={`${a.name} : ${a.currentDays} j sans rechute (record ${a.bestDays} j)`}
          >
            {/* Record en gris, série en cours par-dessus en orange. */}
            <div className="relative h-full">
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${(a.bestDays / max) * 100}%`, background: 'var(--chart-muted)' }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${(a.currentDays / max) * 100}%`, background: 'var(--chart-1)' }}
              />
            </div>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-faint">
        Orange : série en cours · gris : meilleure série (record)
      </p>
    </div>
  )
}

/** Répartition par catégorie : l'identité est portée par la ligne, pas la couleur. */
function CategoryBars({ categories }: { categories: ProfileStats['categories'] }) {
  if (categories.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">Aucune quête terminée pour l'instant.</p>
    )
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

// ── Succès ───────────────────────────────────────────────────

function AchievementGrid({ user, stats }: { user: PublicUser; stats: ProfileStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ACHIEVEMENTS.map((a) => {
        const { current, target } = a.progress(user, stats)
        const unlocked = current >= target
        const Icon = a.icon
        return (
          <div
            key={a.id}
            className={cn(
              'flex flex-col items-center rounded-2xl border p-4 text-center transition-colors',
              unlocked ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface',
            )}
            title={a.description}
          >
            <span
              className={cn(
                'flex size-11 items-center justify-center rounded-full',
                unlocked
                  ? 'bg-accent text-on-accent shadow-[0_0_20px_-4px_var(--accent-glow)]'
                  : 'bg-surface-2 text-faint',
              )}
            >
              <Icon size={20} />
            </span>
            <p className={cn('mt-2.5 text-sm font-semibold', !unlocked && 'text-muted')}>
              {a.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{a.description}</p>
            {unlocked ? (
              <Badge variant="accent" className="mt-2.5">
                <Medal size={11} /> Débloqué
              </Badge>
            ) : (
              <div className="mt-2.5 w-full">
                <ProgressBar value={(current / target) * 100} size="sm" />
                <p className="mt-1 text-[10px] text-faint tabular-nums">
                  {Math.min(current, target)}/{target}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const query = useQuery({ queryKey: ['profile-stats'], queryFn: statsApi.profile })
  const stats = query.data

  if (!user) return null

  const xpForNext = xpForLevel(user.level)
  const xpPercent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0
  const memberSince = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Reconstitue l'XP totale jour par jour (en remontant depuis aujourd'hui),
  // puis en déduit le niveau — base des graphiques « évolution » et « niveau ».
  let xpSeries: { date: string; xp: number }[] = []
  let levelSeries: { date: string; level: number }[] = []
  if (stats) {
    let running = user.totalXp
    const reversed = [...stats.days].reverse().map((d) => {
      const point = { date: d.date, xp: Math.max(0, running) }
      running -= d.xpGained
      return point
    })
    xpSeries = reversed.reverse()
    levelSeries = xpSeries.map((p) => ({ date: p.date, level: levelFromTotalXp(p.xp).level }))
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
      <p className="mt-1 text-sm text-muted">
        Ta progression, tes statistiques et tes succès de joueur.
      </p>

      {/* Informations générales + progression */}
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={user.avatarUrl} name={user.username} size={84} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-xl font-bold">{user.username}</p>
              {stats && (
                <Badge variant="accent">
                  <Trophy size={11} /> #{stats.rank} sur {stats.totalPlayers}
                </Badge>
              )}
              <Badge variant="neutral">
                <CalendarDays size={11} /> Inscrit le {memberSince}
              </Badge>
            </div>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-accent">{user.level}</span>
              <span className="text-sm text-muted">niveau</span>
              <span className="ml-3 text-sm font-semibold tabular-nums">
                {formatXp(user.totalXp)} XP
              </span>
              <span className="text-sm text-muted">au total</span>
            </p>
            <ProgressBar value={xpPercent} className="mt-2" />
            <p className="mt-1.5 text-xs text-muted tabular-nums">
              {formatXp(user.currentXp)}/{formatXp(xpForNext)} XP — encore{' '}
              {formatXp(Math.max(0, xpForNext - user.currentXp))} XP avant le niveau{' '}
              {user.level + 1}
            </p>
          </div>
        </div>
      </Card>

      {query.isLoading || !stats ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : (
        <>
          {/* Statistiques */}
          <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
            <ListChecks size={15} className="text-accent" /> Statistiques
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile icon={Swords} label="Quêtes créées" value={String(stats.questsCreated)} />
            <StatTile icon={Target} label="Quêtes terminées" value={String(stats.questsDone)} />
            <StatTile icon={TrendingUp} label="Taux de réussite" value={`${stats.successRate} %`} />
            <StatTile icon={Award} label="Quête principale" value={`${stats.mainQuestsDone} terminée${stats.mainQuestsDone > 1 ? 's' : ''}`} />
            <StatTile icon={Flame} label="Série actuelle" value={`${user.currentStreak} j`} />
            <StatTile icon={Trophy} label="Meilleure série" value={`${user.longestStreak} j`} />
            <StatTile
              icon={CalendarCheck}
              label="Hebdos réalisées"
              value={String(stats.weeklyCompletions)}
            />
            <StatTile icon={Timer} label="DeepWork total" value={formatHours(stats.focusSeconds)} />
            <StatTile
              icon={Timer}
              label="DeepWork moyen / jour"
              value={formatHours(stats.focusAvgSecondsPerDay)}
            />
            <StatTile
              icon={ShieldCheck}
              label="Addictions suivies"
              value={String(stats.addictionsCount)}
            />
            <StatTile icon={ShieldX} label="Rechutes totales" value={String(stats.relapsesTotal)} />
            <StatTile
              icon={ShieldCheck}
              label="Record sans rechute"
              value={`${stats.longestCleanDays} j`}
            />
          </div>

          {/* Graphiques */}
          <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
            <TrendingUp size={15} className="text-accent" /> Graphiques
          </h2>
          <FeatureGate feature="advanced_stats">
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Évolution de l'XP (30 jours)">
                <XpAreaChart points={xpSeries} />
              </ChartCard>
              <ChartCard title="Progression du niveau (30 jours)">
                <LevelStepChart points={levelSeries} />
              </ChartCard>
              <ChartCard title="Quêtes terminées par semaine (12 semaines)">
                <Bars
                  points={stats.weeks.map((w) => ({
                    key: w.weekStart,
                    label: `Semaine du ${formatDayFr(w.weekStart)}`,
                    value: w.questsDone,
                  }))}
                  formatValue={(v) => `${v} quête${v > 1 ? 's' : ''}`}
                  startLabel={`Sem. du ${formatDayFr(stats.weeks[0]!.weekStart)}`}
                  endLabel="cette semaine"
                />
              </ChartCard>
              <ChartCard title="Temps de DeepWork par jour (30 jours)">
                <Bars
                  points={stats.days.map((d) => ({
                    key: d.date,
                    label: formatDayFr(d.date),
                    value: d.focusSeconds,
                  }))}
                  formatValue={formatHours}
                  startLabel={formatDayFr(stats.days[0]!.date)}
                  endLabel="aujourd'hui"
                />
              </ChartCard>
              <ChartCard title="Activité quotidienne (XP gagnée, 30 jours)">
                <Bars
                  points={stats.days.map((d) => ({
                    key: d.date,
                    label: formatDayFr(d.date),
                    value: d.xpGained,
                  }))}
                  formatValue={(v) => `${formatXp(v)} XP`}
                  startLabel={formatDayFr(stats.days[0]!.date)}
                  endLabel="aujourd'hui"
                />
              </ChartCard>
              <ChartCard title="Addictions — jours sans rechute">
                <AddictionRows addictions={stats.addictions} />
              </ChartCard>
            </div>
            <div className="mt-4">
              <ChartCard title="Répartition des quêtes terminées par catégorie">
                <CategoryBars categories={stats.categories} />
              </ChartCard>
            </div>
          </FeatureGate>

          {/* Succès */}
          <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
            <Medal size={15} className="text-accent" /> Succès
          </h2>
          <div className="mt-3">
            <AchievementGrid user={user} stats={stats} />
          </div>
        </>
      )}
    </div>
  )
}
