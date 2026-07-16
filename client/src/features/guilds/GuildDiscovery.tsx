import type { MyGuildResponse } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Inbox, Plus, Search, Shield, Trophy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { guildsApi } from '@/api/guilds'
import { Badge, Button, Card, Input, Spinner } from '@/components/ui'
import { GuildFormModal } from './GuildFormModal'
import { GuildIcon } from './GuildIcon'
import { GuildRow } from './GuildRow'

function timeAgoFr(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'hier' : `il y a ${days} j`
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Shield
  children: React.ReactNode
}) {
  return (
    <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
      <Icon size={15} className="text-accent" /> {children}
    </h2>
  )
}

/** Invitations que j'ai reçues — accepter fait immédiatement entrer dans la guilde. */
function InvitationsSection() {
  const queryClient = useQueryClient()
  const invitations = useQuery({
    queryKey: ['guild-invitations'],
    queryFn: guildsApi.myInvitations,
  })
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['guild-invitations'] })
    void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
    void queryClient.invalidateQueries({ queryKey: ['guild-leaderboard'] })
  }
  const accept = useMutation({
    mutationFn: (id: string) => guildsApi.acceptInvitation(id),
    onSuccess: invalidate,
  })
  const decline = useMutation({
    mutationFn: (id: string) => guildsApi.declineInvitation(id),
    onSuccess: invalidate,
  })

  const list = invitations.data?.invitations ?? []
  if (list.length === 0) return null

  return (
    <>
      <SectionTitle icon={Inbox}>Invitations reçues · {list.length}</SectionTitle>
      <ul className="mt-3 space-y-2">
        {list.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <GuildIcon icon={invitation.guild.icon} color={invitation.guild.color} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{invitation.guild.name}</p>
              <p className="text-xs text-muted">
                Invité par <b>{invitation.inviter.username}</b> ·{' '}
                {timeAgoFr(invitation.createdAt)} · {invitation.guild.memberCount}/
                {invitation.guild.maxMembers} membres
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={accept.isPending}
                onClick={() => accept.mutate(invitation.id)}
              >
                Accepter
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={decline.isPending}
                onClick={() => decline.mutate(invitation.id)}
              >
                Refuser
              </Button>
            </div>
            {accept.error && (
              <p className="w-full text-xs text-danger">{accept.error.message}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

/** Mes demandes d'adhésion en attente, annulables. */
function MyRequestsSection({ myRequests }: { myRequests: MyGuildResponse['myRequests'] }) {
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: (id: string) => guildsApi.cancelRequest(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['my-guild'] }),
  })
  if (myRequests.length === 0) return null

  return (
    <>
      <SectionTitle icon={Clock}>Demandes envoyées · {myRequests.length}</SectionTitle>
      <ul className="mt-3 space-y-2">
        {myRequests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <GuildIcon icon={request.guild.icon} color={request.guild.color} size={36} />
            <div className="min-w-0 flex-1">
              <Link
                to={`/app/guilds/${request.guild.id}`}
                className="truncate text-sm font-semibold hover:text-accent"
              >
                {request.guild.name}
              </Link>
              <p className="text-xs text-muted">{timeAgoFr(request.createdAt)}</p>
            </div>
            <Badge className="bg-surface-2 text-muted">
              <Clock size={12} /> En attente
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              loading={cancel.isPending}
              onClick={() => cancel.mutate(request.id)}
            >
              <X size={14} /> Annuler
            </Button>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Page Guildes du joueur SANS guilde : recherche instantanée, invitations
 * reçues, demandes envoyées, classement complet et création.
 */
export function GuildDiscovery({ myRequests }: { myRequests: MyGuildResponse['myRequests'] }) {
  const [createOpen, setCreateOpen] = useState(false)
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
    placeholderData: (prev) => prev, // résultats instantanés, sans clignotement
  })

  const searching = query.length >= 1
  const entries = searching ? (search.data?.results ?? []) : (leaderboard.data?.entries ?? [])
  const loading = searching ? search.isPending : leaderboard.isPending

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guildes</h1>
          <p className="mt-1 text-sm text-muted">
            Rejoins une guilde pour progresser en équipe — ou fonde la tienne.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Créer une guilde
        </Button>
      </div>

      <Card className="mt-6 p-5">
        <Input
          label="Rechercher une guilde"
          placeholder="Nom exact ou partiel…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          trailing={<Search size={16} className="text-muted" />}
        />
      </Card>

      <InvitationsSection />
      <MyRequestsSection myRequests={myRequests} />

      <SectionTitle icon={Trophy}>
        {searching
          ? `Résultats · ${entries.length}`
          : `Classement des guildes${leaderboard.data ? ` · ${leaderboard.data.totalGuilds}` : ''}`}
      </SectionTitle>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-accent" />
        </div>
      ) : entries.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {entries.map((entry) => (
            <GuildRow key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : (
        <Card className="mt-3 p-8 text-center">
          <Shield size={28} className="mx-auto text-muted" />
          <p className="mt-3 text-sm font-medium">
            {searching ? `Aucune guilde trouvée pour « ${query} »` : 'Aucune guilde pour l’instant'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {searching
              ? 'Essaie un autre nom — ou fonde la guilde qui manque.'
              : 'Sois le premier : crée la toute première guilde de One Mission.'}
          </p>
        </Card>
      )}

      <GuildFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
