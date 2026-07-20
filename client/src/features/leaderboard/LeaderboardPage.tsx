import type { LeaderboardEntry } from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import { Castle, ChevronRight, Crown, EyeOff, Flame, Search, Trophy, User, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { guildsApi } from '@/api/guilds'
import { leaderboardApi } from '@/api/stats'
import { Avatar, Badge, Button, Card, Input, Spinner, Toggle } from '@/components/ui'
import { GuildRow } from '@/features/guilds/GuildRow'
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

/** Classement des guildes, avec recherche instantanée par nom. */
function GuildsBoard() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 250)
    return () => clearTimeout(t)
  }, [input])

  const leaderboard = useQuery({
    queryKey: ['guild-leaderboard'],
    queryFn: guildsApi.leaderboard,
  })
  const search = useQuery({
    queryKey: ['guild-search', query],
    queryFn: () => guildsApi.search(query),
    enabled: query.length >= 1,
    placeholderData: (prev) => prev,
  })

  const searching = query.length >= 1
  const entries = searching ? (search.data?.results ?? []) : (leaderboard.data?.entries ?? [])
  const loading = searching ? search.isPending : leaderboard.isPending

  return (
    <>
      <Card className="mt-6 p-4">
        <Input
          placeholder="Rechercher une guilde par son nom…"
          aria-label="Rechercher une guilde"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          trailing={<Search size={16} className="text-muted" />}
        />
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : entries.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <GuildRow key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : (
        <Card className="mt-4 p-8 text-center text-sm text-muted">
          {searching ? (
            <>Aucune guilde trouvée pour « {query} ».</>
          ) : (
            <>
              Aucune guilde pour l'instant —{' '}
              <Link to="/app/guilds" className="font-medium text-accent hover:underline">
                crée la première
              </Link>{' '}
              !
            </>
          )}
        </Card>
      )}
    </>
  )
}

type BoardTab = 'players' | 'guilds'

export function LeaderboardPage() {
  const [tab, setTab] = useState<BoardTab>('players')
  const [friendsOnly, setFriendsOnly] = useState(false)
  const scope = friendsOnly ? 'friends' : 'global'
  // Clé de requête par scope : bascule instantanée (cache déjà chaud dès le
  // second aller-retour) sans jamais mélanger les deux classements.
  const query = useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: () => leaderboardApi.get(scope),
  })
  const data = query.data
  const isHidden = useAuthStore((s) => s.user?.showOnLeaderboard === false)
  // Scope amis sans aucun ami : seule son entrée revient (voir friendsLeaderboard côté serveur).
  const noFriends = friendsOnly && !!data && data.entries.length <= 1

  const tabs: { id: BoardTab; label: string; icon: typeof User }[] = [
    { id: 'players', label: 'Joueurs', icon: User },
    { id: 'guilds', label: 'Guildes', icon: Castle },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classement</h1>
          <p className="mt-1 text-sm text-muted">
            {tab === 'guilds'
              ? 'Les guildes les plus puissantes, classées par Score global.'
              : data
                ? friendsOnly
                  ? noFriends
                    ? "Ton classement entre amis, une fois que tu en auras."
                    : `${data.totalPlayers} amis (toi compris) dans ce classement.`
                  : `${data.totalPlayers} joueur${data.totalPlayers > 1 ? 's' : ''} en quête de leur mission.`
                : 'Les joueurs les plus réguliers, classés par XP totale.'}
          </p>
        </div>
        {tab === 'players' &&
          data &&
          !noFriends &&
          (isHidden && !friendsOnly ? (
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

      {/* ── Joueurs / Guildes ── */}
      <div className="mt-5 flex gap-1 rounded-2xl border border-line bg-surface p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              tab === id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink',
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <Card className="mt-4 p-4">
          <Toggle checked={friendsOnly} onChange={setFriendsOnly} label="Afficher uniquement mes amis" />
        </Card>
      )}

      {tab === 'guilds' ? (
        <GuildsBoard />
      ) : query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : data ? (
        noFriends ? (
          <Card className="mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <Users size={26} className="text-faint" />
            <p className="text-sm text-muted">
              Vous n'avez pas encore d'amis. Ajoutez des joueurs pour afficher votre classement
              entre amis.
            </p>
            <Link to="/app/friends">
              <Button size="sm">
                <Search size={14} /> Rechercher des joueurs
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <ul className="mt-6 flex flex-col gap-2">
              {data.entries.map((e) => (
                <Row key={e.rank} entry={e} />
              ))}
            </ul>

            {/* Profil masqué : le joueur n'apparaît nulle part, on lui explique pourquoi */}
            {isHidden && !friendsOnly ? (
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
              /* Hors du top : rappelle la position du joueur (jamais le cas en scope amis, tous inclus) */
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
        )
      ) : (
        <Card className="mt-6 p-8 text-center text-sm text-muted">
          Impossible de charger le classement.
        </Card>
      )}
    </div>
  )
}
