import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Flame, ShieldCheck, Timer, TrendingUp, Trophy, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { guildsApi } from '@/api/guilds'
import { Card, Spinner } from '@/components/ui'
import { formatHours, formatXp } from '@/features/profile/format'
import { Bars, ChartCard, StatTile } from '@/features/profile/widgets'
import { formatDayFr } from '@/lib/dates'
import { usePageTitle } from '@/lib/usePageTitle'
import { GuildIcon } from './GuildIcon'

const axisTick = { fontSize: 10, fill: 'var(--faint)' }

function GuildTooltip({
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

/** Aire d'évolution générique (XP, membres) aux couleurs de la guilde. */
function EvolutionArea({
  points,
  dataKey,
  color,
  format,
}: {
  points: Record<string, string | number>[]
  dataKey: string
  color: string
  format: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={points} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
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
          tickFormatter={(v: number) => format(v)}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<GuildTooltip format={format} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#fill-${dataKey})`}
          activeDot={{ r: 4, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Rang mondial : axe inversé, le sommet (n° 1) en haut. */
function RankChart({ points, color }: { points: { date: string; rank: number }[]; color: string }) {
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
          reversed
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={30}
          allowDecimals={false}
          domain={[1, (max: number) => max + 1]}
        />
        <Tooltip content={<GuildTooltip format={(v) => `#${v} mondial`} />} />
        <Line
          type="stepAfter"
          dataKey="rank"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Statistiques d'une guilde : évolutions quotidiennes + totaux collectifs. */
export function GuildStatsPage() {
  const { guildId = '' } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['guild-stats', guildId],
    queryFn: () => guildsApi.stats(guildId),
    enabled: guildId.length > 0,
  })
  const data = query.data
  usePageTitle(data ? `Statistiques — ${data.guild.name}` : 'Statistiques de guilde')

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-accent" />
      </div>
    )
  }
  if (!data) {
    return (
      <Card className="mx-auto mt-6 max-w-3xl p-8 text-center text-sm text-muted">
        Impossible de charger les statistiques de cette guilde.
      </Card>
    )
  }

  const color = data.guild.color
  const history = data.history

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => void navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Retour
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <GuildIcon icon={data.guild.icon} color={color} size={56} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Statistiques —{' '}
            <Link to={`/app/guilds/${data.guild.id}`} className="hover:text-accent">
              {data.guild.name}
            </Link>
          </h1>
          <p className="mt-1 text-sm text-muted">
            L'évolution collective de la guilde, jour après jour.
          </p>
        </div>
      </div>

      {/* ── Totaux collectifs ── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          icon={Timer}
          label="DeepWork cumulé"
          value={formatHours(data.totals.focusSeconds)}
        />
        <StatTile
          icon={ShieldCheck}
          label="Addictions combattues"
          value={String(data.totals.addictionsCount)}
        />
        <StatTile
          icon={ShieldCheck}
          label="Jours sans rechute (cumul)"
          value={`${data.totals.cleanDaysTotal.toLocaleString('fr-FR')} j`}
        />
        <StatTile icon={Flame} label="Séries cumulées" value={`${data.totals.totalStreak} j`} />
        <StatTile
          icon={Trophy}
          label="Meilleure série du clan"
          value={`${data.totals.bestStreak} j`}
        />
      </div>

      {/* ── Évolutions ── */}
      {history.length < 2 && (
        <Card className="mt-6 p-5 text-sm text-muted">
          Les graphiques d'évolution se dessinent au fil des jours : un instantané des
          statistiques de la guilde est enregistré chaque jour. Reviens demain !
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Évolution de l'XP totale">
          <EvolutionArea
            points={history.map((h) => ({ date: h.date, xp: h.totalXp }))}
            dataKey="xp"
            color={color}
            format={(v) => `${formatXp(v)} XP`}
          />
        </ChartCard>
        <ChartCard title="Évolution du classement mondial">
          <RankChart
            points={history.map((h) => ({ date: h.date, rank: h.rank }))}
            color={color}
          />
        </ChartCard>
        <ChartCard title="Évolution du nombre de membres">
          <EvolutionArea
            points={history.map((h) => ({ date: h.date, membres: h.memberCount }))}
            dataKey="membres"
            color={color}
            format={(v) => `${v} membre${v > 1 ? 's' : ''}`}
          />
        </ChartCard>
        <ChartCard title="Quêtes terminées par semaine (12 semaines)">
          <Bars
            points={data.weeks.map((w) => ({
              key: w.weekStart,
              label: `Semaine du ${formatDayFr(w.weekStart)}`,
              value: w.questsDone,
            }))}
            formatValue={(v) => `${v} quête${v > 1 ? 's' : ''}`}
            startLabel={
              data.weeks[0] ? `Sem. du ${formatDayFr(data.weeks[0].weekStart)}` : ''
            }
            endLabel="cette semaine"
          />
        </ChartCard>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-faint">
        <TrendingUp size={12} />
        Les totaux portent sur les membres actuels ; l'historique fige un instantané quotidien.
        <Users size={12} className="ml-2" />
        Score = XP + 20 × quêtes + 30 × séries.
      </p>
    </div>
  )
}
