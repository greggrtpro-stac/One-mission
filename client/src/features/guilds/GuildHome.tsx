import type { GuildDto, GuildJoinRequestDto } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  DoorOpen,
  Lock,
  LockOpen,
  MessageCircle,
  Pencil,
  Settings2,
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { guildsApi } from '@/api/guilds'
import { Avatar, Badge, Button, Card, ConfirmDialog } from '@/components/ui'
import { cn } from '@/lib/cn'
import { GuildChat } from './GuildChat'
import { GuildFormModal } from './GuildFormModal'
import { GuildIcon } from './GuildIcon'
import { GuildMembers } from './GuildMembers'
import { InviteModal } from './InviteModal'

type Tab = 'chat' | 'members' | 'requests'

function JoinRequestRow({ request, guildId }: { request: GuildJoinRequestDto; guildId: string }) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
    void queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
  }
  const accept = useMutation({
    mutationFn: () => guildsApi.acceptRequest(request.id),
    onSuccess: invalidate,
  })
  const decline = useMutation({
    mutationFn: () => guildsApi.declineRequest(request.id),
    onSuccess: invalidate,
  })

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <Link
        to={`/app/leaderboard/${request.user.userId}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar src={request.user.avatarUrl} name={request.user.username} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{request.user.username}</p>
          <p className="text-xs text-muted">Niveau {request.user.level}</p>
        </div>
      </Link>
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
      {request.message && (
        <p className="w-full rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted italic">
          « {request.message} »
        </p>
      )}
      {accept.error && <p className="w-full text-xs text-danger">{accept.error.message}</p>}
    </li>
  )
}

/** Page « Ma guilde » : en-tête, gestion et onglets Chat / Membres / Demandes. */
export function GuildHome({
  guild,
  joinRequests,
  unreadMessages,
}: {
  guild: GuildDto
  joinRequests: GuildJoinRequestDto[]
  unreadMessages: number
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('chat')
  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const myRole = guild.relation.kind === 'member' ? guild.relation.role : null
  const iAmLeader = myRole === 'LEADER'
  const canManage = myRole === 'LEADER' || myRole === 'OFFICER'
  const aloneAboard = guild.memberCount === 1

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
    void queryClient.invalidateQueries({ queryKey: ['guild-leaderboard'] })
    void queryClient.invalidateQueries({ queryKey: ['guild', guild.id] })
  }
  const leave = useMutation({ mutationFn: guildsApi.leave, onSuccess: invalidateAll })
  const removeGuild = useMutation({
    mutationFn: () => guildsApi.remove(guild.id),
    onSuccess: invalidateAll,
  })

  const createdAt = new Date(guild.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'chat', label: 'Discussion', icon: MessageCircle, badge: unreadMessages },
    { id: 'members', label: `Membres · ${guild.memberCount}/${guild.maxMembers}`, icon: Users },
    ...(canManage
      ? [
          {
            id: 'requests' as Tab,
            label: 'Demandes',
            icon: UserPlus,
            badge: joinRequests.length,
          },
        ]
      : []),
  ]

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── En-tête ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-4">
          <GuildIcon icon={guild.icon} color={guild.color} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{guild.name}</h1>
              <Badge variant="accent">
                <Trophy size={11} /> #{guild.rank} sur {guild.totalGuilds}
              </Badge>
              <Badge variant={guild.isOpen ? 'success' : 'neutral'}>
                {guild.isOpen ? <LockOpen size={11} /> : <Lock size={11} />}
                {guild.isOpen ? 'Ouverte' : 'Sur demande'}
              </Badge>
              {guild.minLevel > 1 && <Badge variant="outline">Niveau {guild.minLevel}+</Badge>}
            </div>
            {guild.description && (
              <p className="mt-1.5 text-sm text-muted">{guild.description}</p>
            )}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
              <span>
                <b className="text-ink">{guild.totals.score.toLocaleString('fr-FR')}</b> score
              </span>
              <span>
                <b className="text-ink">{guild.totals.totalXp.toLocaleString('fr-FR')}</b> XP
              </span>
              <span>
                Nv. moyen <b className="text-ink">{guild.totals.avgLevel}</b>
              </span>
              <span>
                <b className="text-ink">{guild.totals.questsDone.toLocaleString('fr-FR')}</b>{' '}
                quêtes
              </span>
              <span>Fondée le {createdAt}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/app/guilds/${guild.id}/stats`}>
            <Button size="sm" variant="secondary">
              <TrendingUp size={14} /> Statistiques
            </Button>
          </Link>
          {canManage && (
            <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} /> Inviter
            </Button>
          )}
          {iAmLeader && (
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> Modifier
            </Button>
          )}
          <span className="flex-1" />
          {(!iAmLeader || aloneAboard) && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmLeave(true)}>
              <DoorOpen size={14} /> Quitter
            </Button>
          )}
          {iAmLeader && !aloneAboard && (
            <Button
              size="sm"
              variant="ghost"
              title="Transfère d'abord la propriété (couronne dans la liste des membres) pour pouvoir quitter"
              onClick={() => setConfirmLeave(true)}
            >
              <DoorOpen size={14} /> Quitter
            </Button>
          )}
          {iAmLeader && (
            <Button size="sm" variant="danger-soft" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Supprimer
            </Button>
          )}
        </div>
      </Card>

      {/* ── Onglets ── */}
      <div className="mt-6 flex gap-1 rounded-2xl border border-line bg-surface p-1">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              tab === id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink',
            )}
          >
            <Icon size={15} />
            <span className="truncate">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent tabular-nums">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'chat' && <GuildChat guildId={guild.id} />}
        {tab === 'members' && <GuildMembers guild={guild} myRole={myRole} />}
        {tab === 'requests' &&
          (joinRequests.length > 0 ? (
            <ul className="space-y-2">
              {joinRequests.map((request) => (
                <JoinRequestRow key={request.id} request={request} guildId={guild.id} />
              ))}
            </ul>
          ) : (
            <Card className="p-8 text-center">
              <Settings2 size={28} className="mx-auto text-muted" />
              <p className="mt-3 text-sm font-medium">Aucune demande en attente</p>
              <p className="mt-1 text-sm text-muted">
                Les demandes d'adhésion des joueurs apparaîtront ici.
              </p>
            </Card>
          ))}
      </div>

      {/* ── Modales ── */}
      <GuildFormModal open={editOpen} onClose={() => setEditOpen(false)} guild={guild} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} guildId={guild.id} />

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => leave.mutate()}
        icon={DoorOpen}
        tone="warning"
        title="Quitter la guilde ?"
        description={
          iAmLeader && aloneAboard ? (
            <>
              Tu es le dernier membre : quitter <b>{guild.name}</b> supprimera définitivement la
              guilde, son chat et son historique.
            </>
          ) : iAmLeader ? (
            <>
              Tu es le chef : transfère d'abord la propriété à un autre membre (icône couronne dans
              l'onglet Membres). Cette tentative sera refusée par le serveur.
            </>
          ) : (
            <>
              Tu ne feras plus partie de <b>{guild.name}</b>. Tu pourras la rejoindre à nouveau
              plus tard.
            </>
          )
        }
        confirmLabel="Quitter"
        loading={leave.isPending}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => removeGuild.mutate()}
        icon={Trash2}
        tone="danger"
        title="Supprimer la guilde ?"
        description={
          <>
            <b>{guild.name}</b>, ses {guild.memberCount} membre
            {guild.memberCount > 1 ? 's' : ''}, son chat et tout son historique seront
            définitivement supprimés. Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer définitivement"
        loading={removeGuild.isPending}
      />

      {leave.error && (
        <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {leave.error.message}
        </p>
      )}
    </div>
  )
}
