import type {
  FriendDto,
  FriendPlayerCard,
  FriendSearchResult,
  ReceivedFriendRequestDto,
  SentFriendRequestDto,
} from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, Inbox, Search, Send, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { friendsApi } from '@/api/friends'
import { Avatar, Badge, Button, Card, ConfirmDialog, Input, Spinner } from '@/components/ui'
import { PlanBadge } from '@/features/subscription/PlanBadge'
import { usePageTitle } from '@/lib/usePageTitle'

/** "il y a 3 min / 2 h / 5 j" — pour la dernière connexion et les demandes. */
function timeAgoFr(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'hier' : `il y a ${days} j`
}

/** Identité compacte commune : avatar, pseudo, niveau, offre. */
function PlayerIdentity({ player }: { player: FriendPlayerCard }) {
  return (
    <>
      <Avatar src={player.avatarUrl} name={player.username} size={36} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-semibold">
          {player.username}
          <PlanBadge plan={player.plan} className="text-[10px]" />
        </p>
        <p className="text-xs text-muted">Niveau {player.level}</p>
      </div>
    </>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Users
  children: React.ReactNode
}) {
  return (
    <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
      <Icon size={15} className="text-accent" /> {children}
    </h2>
  )
}

const rowClass =
  'flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3'

// ── Recherche ────────────────────────────────────────────────

function SearchResultRow({ result }: { result: FriendSearchResult }) {
  const queryClient = useQueryClient()
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['friend-search'] })
    void queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['friends'] })
  }
  const add = useMutation({
    mutationFn: () => friendsApi.sendRequest(result.userId),
    onSuccess: invalidateAll,
  })
  const accept = useMutation({
    mutationFn: () => friendsApi.acceptRequest(result.requestId!),
    onSuccess: invalidateAll,
  })

  return (
    <li className={rowClass}>
      <PlayerIdentity player={result} />
      {result.relation === 'none' && (
        <Button size="sm" loading={add.isPending} onClick={() => add.mutate()}>
          <UserPlus size={14} /> Ajouter
        </Button>
      )}
      {result.relation === 'pending_sent' && (
        <Badge className="bg-surface-2 text-muted">
          <Clock size={12} /> En attente
        </Badge>
      )}
      {result.relation === 'pending_received' && (
        <Button size="sm" loading={accept.isPending} onClick={() => accept.mutate()}>
          <Check size={14} /> Accepter
        </Button>
      )}
      {result.relation === 'friend' && (
        <Badge variant="accent">
          <Users size={12} /> Amis
        </Badge>
      )}
      {add.error && <p className="w-full text-xs text-danger">{add.error.message}</p>}
    </li>
  )
}

function SearchSection() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  // Petit debounce : on n'interroge pas le serveur à chaque frappe.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])

  const search = useQuery({
    queryKey: ['friend-search', query],
    queryFn: () => friendsApi.search(query),
    enabled: query.length >= 2,
  })

  return (
    <Card className="p-5">
      <Input
        label="Rechercher un joueur"
        placeholder="Pseudo exact ou partiel…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        trailing={<Search size={16} className="text-muted" />}
      />
      {query.length >= 2 && (
        <div className="mt-4">
          {search.isPending ? (
            <div className="flex justify-center py-4">
              <Spinner className="text-accent" />
            </div>
          ) : search.data && search.data.results.length > 0 ? (
            <ul className="space-y-2">
              {search.data.results.map((result) => (
                <SearchResultRow key={result.userId} result={result} />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted">
              Aucun joueur trouvé pour « {query} ».
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Demandes reçues / envoyées ───────────────────────────────

function ReceivedRequestRow({ request }: { request: ReceivedFriendRequestDto }) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['friends'] })
  }
  const accept = useMutation({
    mutationFn: () => friendsApi.acceptRequest(request.id),
    onSuccess: invalidate,
  })
  const decline = useMutation({
    mutationFn: () => friendsApi.declineRequest(request.id),
    onSuccess: invalidate,
  })

  return (
    <li className={rowClass}>
      <PlayerIdentity player={request.sender} />
      <span className="text-xs text-muted">{timeAgoFr(request.createdAt)}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" loading={accept.isPending} onClick={() => accept.mutate()}>
          <Check size={14} /> Accepter
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={decline.isPending}
          onClick={() => decline.mutate()}
        >
          <X size={14} /> Refuser
        </Button>
      </div>
    </li>
  )
}

function SentRequestRow({ request }: { request: SentFriendRequestDto }) {
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => friendsApi.cancelRequest(request.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['friend-requests'] }),
  })

  return (
    <li className={rowClass}>
      <PlayerIdentity player={request.receiver} />
      <span className="text-xs text-muted">{timeAgoFr(request.createdAt)}</span>
      <Badge className="bg-surface-2 text-muted">
        <Clock size={12} /> En attente
      </Badge>
      <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate()}>
        <X size={14} /> Annuler
      </Button>
    </li>
  )
}

// ── Liste d'amis ─────────────────────────────────────────────

function FriendCard({ friend }: { friend: FriendDto }) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => friendsApi.removeFriend(friend.userId),
    onSuccess: () => {
      setConfirmRemove(false)
      void queryClient.invalidateQueries({ queryKey: ['friends'] })
      void queryClient.invalidateQueries({ queryKey: ['friend-search'] })
    },
  })

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <PlayerIdentity player={friend} />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        {friend.online !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={
                friend.online ? 'size-2 rounded-full bg-success' : 'size-2 rounded-full bg-line'
              }
            />
            {friend.online ? 'En ligne' : 'Hors ligne'}
          </span>
        )}
        {friend.online === false && friend.lastSeenAt && (
          <span>· vu {timeAgoFr(friend.lastSeenAt)}</span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Link to={`/app/leaderboard/${friend.userId}`} className="flex-1">
          <Button size="sm" variant="secondary" className="w-full">
            Voir le profil
          </Button>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmRemove(true)}
          title={`Retirer ${friend.username} de tes amis`}
          aria-label={`Retirer ${friend.username} de tes amis`}
        >
          <UserMinus size={15} />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => remove.mutate()}
        icon={UserMinus}
        tone="danger"
        title="Retirer cet ami ?"
        description={
          <>
            <b>{friend.username}</b> ne fera plus partie de tes amis. Vous pourrez toujours vous
            renvoyer une demande plus tard.
          </>
        }
        confirmLabel="Retirer"
        loading={remove.isPending}
      />
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────

export function FriendsPage() {
  usePageTitle('Amis')
  const friends = useQuery({ queryKey: ['friends'], queryFn: friendsApi.list })
  const requests = useQuery({ queryKey: ['friend-requests'], queryFn: friendsApi.requests })

  const received = requests.data?.received ?? []
  const sent = requests.data?.sent ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Amis</h1>
      <p className="mt-1 text-sm text-muted">
        Retrouve d'autres joueurs par leur pseudo et avancez ensemble.
      </p>

      <div className="mt-6">
        <SearchSection />
      </div>

      {received.length > 0 && (
        <>
          <SectionTitle icon={Inbox}>Demandes reçues · {received.length}</SectionTitle>
          <ul className="mt-3 space-y-2">
            {received.map((request) => (
              <ReceivedRequestRow key={request.id} request={request} />
            ))}
          </ul>
        </>
      )}

      {sent.length > 0 && (
        <>
          <SectionTitle icon={Send}>Demandes envoyées · {sent.length}</SectionTitle>
          <ul className="mt-3 space-y-2">
            {sent.map((request) => (
              <SentRequestRow key={request.id} request={request} />
            ))}
          </ul>
        </>
      )}

      <SectionTitle icon={Users}>
        Mes amis{friends.data ? ` · ${friends.data.friends.length}` : ''}
      </SectionTitle>
      {friends.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-accent" />
        </div>
      ) : friends.data && friends.data.friends.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {friends.data.friends.map((friend) => (
            <FriendCard key={friend.userId} friend={friend} />
          ))}
        </div>
      ) : (
        <Card className="mt-3 p-8 text-center">
          <Users size={28} className="mx-auto text-muted" />
          <p className="mt-3 text-sm font-medium">Aucun ami pour l'instant</p>
          <p className="mt-1 text-sm text-muted">
            Recherche un joueur par son pseudo ci-dessus pour lui envoyer une demande.
          </p>
        </Card>
      )}
    </div>
  )
}
