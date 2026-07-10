import type { LeaderboardEntry } from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Crown, EyeOff, Flame, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { leaderboardApi } from '@/api/stats'
import { Avatar, Badge, Card, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'

const PODIUM_STYLES = [
  'text-[#f5c542]', // or
  'text-[#a8b0bd]', // argent
  'text-[#c98a4b]', // bronze
]

function Row({ entry }: { entry: LeaderboardEntry }) {
  const podium = entry.rank <= 3
  return (
    <li>
      {/* Toute la carte ouvre le profil public du joueur. */}
      <Link
        to={`/app/leaderboard/${entry.userId}`}
        title={`Voir le profil public de ${entry.username}`}
        className={cn(
          'group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
          entry.isMe
            ? 'border-accent bg-accent-soft hover:bg-accent-soft/80'
            : 'border-line bg-surface hover:border-accent/50 hover:bg-surface-2',
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
        <ChevronRight
          size={16}
          className="shrink-0 text-faint transition-colors group-hover:text-accent"
        />
      </Link>
    </li>
  )
}

export function LeaderboardPage() {
  const query = useQuery({ queryKey: ['leaderboard'], queryFn: leaderboardApi.get })
  const data = query.data
  const isHidden = useAuthStore((s) => s.user?.showOnLeaderboard === false)

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
        {data &&
          (isHidden ? (
            <Badge variant="outline" className="text-sm">
              <EyeOff size={13} /> Profil masqué
            </Badge>
          ) : (
            <Badge variant="accent" className="text-sm">
              <Trophy size={13} /> Ton rang : {data.me.rank}
              {data.me.rank === 1 ? 'ᵉʳ' : 'ᵉ'}
            </Badge>
          ))}
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

          {/* Profil masqué : le joueur n'apparaît nulle part, on lui explique pourquoi */}
          {isHidden ? (
            <Card className="mt-4 flex items-center gap-3 p-4 text-sm text-muted">
              <EyeOff size={16} className="shrink-0" />
              <p>
                Ton profil est masqué du classement public : les autres joueurs ne te voient pas.
                Tu continues à gagner de l'XP — réactive l'option dans les{' '}
                <Link to="/app/settings" className="font-medium text-accent hover:underline">
                  Paramètres
                </Link>{' '}
                pour réapparaître avec ton rang à jour.
              </p>
            </Card>
          ) : (
            /* Hors du top : rappelle la position du joueur */
            !data.entries.some((e) => e.isMe) && (
              <div className="mt-4">
                <p className="mb-2 text-center text-xs text-faint">⋯</p>
                <ul>
                  <Row entry={data.me} />
                </ul>
              </div>
            )
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
