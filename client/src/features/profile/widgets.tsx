import { Medal, type LucideIcon } from 'lucide-react'
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
import { Badge, Card, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDayFr } from '@/lib/dates'
import { ACHIEVEMENTS, type AchievementStats, type AchievementUser } from './achievements'
import { formatXp } from './format'

/**
 * Briques d'affichage partagées entre la page Profil et le profil public
 * d'un joueur (accessible depuis le classement).
 */

// ── Briques d'affichage ──────────────────────────────────────

export function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
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

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
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
export function XpAreaChart({ points }: { points: { date: string; xp: number }[] }) {
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
export function LevelStepChart({ points }: { points: { date: string; level: number }[] }) {
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
export function Bars({
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

// ── Succès ───────────────────────────────────────────────────

export function AchievementGrid({
  user,
  stats,
}: {
  user: AchievementUser
  stats: AchievementStats
}) {
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
