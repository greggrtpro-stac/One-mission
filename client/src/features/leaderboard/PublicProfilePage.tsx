import { xpForLevel } from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Award,
  CalendarCheck,
  CalendarDays,
  EyeOff,
  Flame,
  ListChecks,
  Medal,
  ShieldCheck,
  Target,
  Timer,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { leaderboardApi } from '@/api/stats'
import { ApiRequestError } from '@/api/http'
import { Avatar, Badge, Button, Card, ProgressBar, Spinner } from '@/components/ui'
import { buildXpLevelSeries, formatHours, formatXp } from '@/features/profile/format'
import {
  AchievementGrid,
  Bars,
  ChartCard,
  LevelStepChart,
  StatTile,
  XpAreaChart,
} from '@/features/profile/widgets'
import { FeatureGate } from '@/features/subscription/FeatureGate'
import { formatDayFr } from '@/lib/dates'

function BackLink() {
  return (
    <Link
      to="/app/leaderboard"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-accent"
    >
      <ArrowLeft size={15} /> Retour au classement
    </Link>
  )
}

/**
 * Profil public d'un joueur, ouvert depuis le classement.
 * Même identité visuelle que la page Profil, mais uniquement les données
 * publiques renvoyées par l'API (jamais d'e-mail, de nom réel ni de
 * contenu privé) — consultation seule.
 */
export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const query = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => leaderboardApi.profile(userId!),
    enabled: Boolean(userId),
    retry: (failureCount, error) =>
      // Inutile de réessayer un profil masqué ou inexistant.
      !(error instanceof ApiRequestError && error.status === 404) && failureCount < 2,
  })

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <BackLink />
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      </div>
    )
  }

  // Profil masqué du classement ou identifiant inconnu : même écran,
  // pour ne rien révéler de l'existence du compte.
  if (!query.data) {
    return (
      <div className="mx-auto max-w-5xl">
        <BackLink />
        <Card className="mt-6 flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <EyeOff size={24} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Profil indisponible</h1>
            <p className="mt-1.5 max-w-sm text-sm text-muted">
              Ce joueur n'existe pas ou a choisi de masquer son profil du classement public.
            </p>
          </div>
          <Link to="/app/leaderboard">
            <Button variant="secondary">
              <ArrowLeft size={15} /> Retour au classement
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const { user, stats } = query.data
  const xpForNext = xpForLevel(user.level)
  const xpPercent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0
  const memberSince = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const { xpSeries, levelSeries } = buildXpLevelSeries(user.totalXp, stats.days)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil de {user.username}</h1>
          <p className="mt-1 text-sm text-muted">
            Progression, statistiques et succès publics de ce joueur.
          </p>
        </div>
        <BackLink />
      </div>

      {/* Informations générales + progression */}
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={user.avatarUrl} name={user.username} size={84} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-xl font-bold">{user.username}</p>
              <Badge variant="accent">
                <Trophy size={11} /> #{stats.rank} sur {stats.totalPlayers}
              </Badge>
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

      {/* Statistiques publiques */}
      <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
        <ListChecks size={15} className="text-accent" /> Statistiques
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile icon={Target} label="Quêtes terminées" value={String(stats.questsDone)} />
        <StatTile icon={TrendingUp} label="Taux de réussite" value={`${stats.successRate} %`} />
        <StatTile icon={Flame} label="Série actuelle" value={`${user.currentStreak} j`} />
        <StatTile icon={Trophy} label="Meilleure série" value={`${user.longestStreak} j`} />
        <StatTile
          icon={Award}
          label="Quête principale"
          value={`${stats.mainQuestsDone} terminée${stats.mainQuestsDone > 1 ? 's' : ''}`}
        />
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
        <StatTile
          icon={ShieldCheck}
          label="Record sans rechute"
          value={`${stats.longestCleanDays} j`}
        />
      </div>

      {/* Graphiques publics — consultation seule */}
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
        </div>
      </FeatureGate>

      {/* Succès */}
      <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
        <Medal size={15} className="text-accent" /> Succès
      </h2>
      <div className="mt-3">
        <AchievementGrid user={user} stats={stats} />
      </div>

      <div className="mt-8 flex justify-center">
        <Link to="/app/leaderboard">
          <Button variant="secondary">
            <ArrowLeft size={15} /> Retour au classement
          </Button>
        </Link>
      </div>
    </div>
  )
}
