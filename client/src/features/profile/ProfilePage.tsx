import {
  CATEGORY_LABELS,
  xpForLevel,
  type ProfileStats,
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
} from 'lucide-react'
import { statsApi } from '@/api/stats'
import { Avatar, Badge, Card, ProgressBar, Spinner } from '@/components/ui'
import { FeatureGate } from '@/features/subscription/FeatureGate'
import { formatDayFr } from '@/lib/dates'
import { useAuthStore } from '@/stores/auth'
import { buildXpLevelSeries, formatHours, formatXp } from './format'
import {
  AchievementGrid,
  Bars,
  ChartCard,
  LevelStepChart,
  StatTile,
  XpAreaChart,
} from './widgets'

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
            {/* Record en gris, série en cours par-dessus en violet. */}
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
        Violet : série en cours · gris : meilleure série (record)
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

  const { xpSeries, levelSeries } = stats
    ? buildXpLevelSeries(user.totalXp, stats.days)
    : { xpSeries: [], levelSeries: [] }

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
