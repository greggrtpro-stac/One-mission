import type { LeaderboardEntry } from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import { Crown, Flame, Trophy } from 'lucide-react'
import { leaderboardApi } from '@/api/stats'
import { Avatar, Badge, Card, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

const PODIUM_STYLES = [
  'text-[#f5c542]', // or
  'text-[#a8b0bd]', // argent
  'text-[#c98a4b]', // bronze
]

function Row({ entry }: { entry: LeaderboardEntry }) {
  const podium = entry.rank <= 3
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-4 py-3',
        entry.isMe
          ? 'border-accent bg-accent-soft'
          : 'border-line bg-surface',
      )}
    >
      <span className="flex w-8 shrink-0 items-center justify-center">
        {podium ? (
          <Crown size={20} className={PODIUM_STYLES[entry.rank - 1]} fill="currentColor" />
        ) : (
          <span className="text-sm font-bold text-muted tabular-nums">{entry.rank}</span>
        )}
      </span>
      <Avatar src={entry.avatarUrl} name={entry.username} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {entry.username}
          {entry.isMe && <span className="ml-1.5 text-xs font-medium text-accent">(toi)</span>}
        </p>
        <p className="text-xs text-muted">Niveau {entry.level}</p>
      </div>
      {entry.currentStreak > 0 && (
        <Badge variant="warning" title="Série d'activité">
          <Flame size={11} /> {entry.currentStreak} j
        </Badge>
      )}
      <p className="w-20 shrink-0 text-right text-sm font-bold text-accent tabular-nums">
        {entry.totalXp.toLocaleString('fr-FR')} XP
      </p>
    </li>
  )
}

export function LeaderboardPage() {
  const query = useQuery({ queryKey: ['leaderboard'], queryFn: leaderboardApi.get })
  const data = query.data

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classement</h1>
          <p className="mt-1 text-sm text-muted">
            {data
              ? `${data.totalPlayers} joueur${data.totalPlayers > 1 ? 's' : ''} en quête de leur mission.`
              : 'Les joueurs les plus réguliers, classés par XP totale.'}
          </p>
        </div>
        {data && (
          <Badge variant="accent" className="text-sm">
            <Trophy size={13} /> Ton rang : {data.me.rank}
            {data.me.rank === 1 ? 'ᵉʳ' : 'ᵉ'}
          </Badge>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : data ? (
        <>
          <ul className="mt-6 flex flex-col gap-2">
            {data.entries.map((e) => (
              <Row key={e.rank} entry={e} />
            ))}
          </ul>

          {/* Hors du top : rappelle la position du joueur */}
          {!data.entries.some((e) => e.isMe) && (
            <div className="mt-4">
              <p className="mb-2 text-center text-xs text-faint">⋯</p>
              <ul>
                <Row entry={data.me} />
              </ul>
            </div>
          )}
        </>
      ) : (
        <Card className="mt-6 p-8 text-center text-sm text-muted">
          Impossible de charger le classement.
        </Card>
      )}
    </div>
  )
}
