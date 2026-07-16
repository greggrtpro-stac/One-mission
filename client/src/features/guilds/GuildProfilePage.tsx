import { GUILD_ROLE_LABELS } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Crown,
  Flame,
  Lock,
  LockOpen,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { guildsApi } from '@/api/guilds'
import { Avatar, Badge, Button, Card, Spinner } from '@/components/ui'
import { StatTile } from '@/features/profile/widgets'
import { usePageTitle } from '@/lib/usePageTitle'
import { GuildIcon, RoleBadge } from './GuildIcon'

/**
 * Fiche publique d'une guilde, ouverte depuis le classement, la recherche ou
 * un profil. Toutes les infos + le bouton Rejoindre selon l'état (ouverte,
 * sur demande, complète, déjà membre, invitation en attente).
 */
export function GuildProfilePage() {
  const { guildId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['guild', guildId],
    queryFn: () => guildsApi.get(guildId),
    enabled: guildId.length > 0,
  })
  const guild = query.data?.guild
  usePageTitle(guild ? `Guilde ${guild.name}` : 'Guilde')

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
    void queryClient.invalidateQueries({ queryKey: ['guild-leaderboard'] })
  }
  const join = useMutation({
    mutationFn: () => guildsApi.join(guildId),
    onSuccess: (result) => {
      invalidate()
      // Entrée directe : on file sur la page Ma guilde (chat, membres).
      if (result.status === 'joined') void navigate('/app/guilds')
    },
  })
  const cancelRequest = useMutation({
    mutationFn: (requestId: string) => guildsApi.cancelRequest(requestId),
    onSuccess: invalidate,
  })
  const acceptInvitation = useMutation({
    mutationFn: (invitationId: string) => guildsApi.acceptInvitation(invitationId),
    onSuccess: () => {
      invalidate()
      void navigate('/app/guilds')
    },
  })

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-accent" />
      </div>
    )
  }

  if (!guild) {
    return (
      <Card className="mx-auto mt-6 max-w-3xl p-8 text-center text-sm text-muted">
        Guilde introuvable — elle a peut-être été dissoute.
      </Card>
    )
  }

  const full = guild.memberCount >= guild.maxMembers
  const createdAt = new Date(guild.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const relation = guild.relation

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => void navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Retour
      </button>

      {/* ── En-tête ── */}
      <Card className="mt-4 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <GuildIcon icon={guild.icon} color={guild.color} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{guild.name}</h1>
              <Badge variant="accent">
                <Trophy size={11} /> #{guild.rank} mondial
              </Badge>
              <Badge variant={guild.isOpen ? 'success' : 'neutral'}>
                {guild.isOpen ? <LockOpen size={11} /> : <Lock size={11} />}
                {guild.isOpen ? 'Ouverte' : 'Sur demande'}
              </Badge>
              {guild.minLevel > 1 && <Badge variant="outline">Niveau {guild.minLevel}+</Badge>}
            </div>
            {guild.description && <p className="mt-1.5 text-sm text-muted">{guild.description}</p>}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {guild.leader && (
                <span className="inline-flex items-center gap-1">
                  <Crown size={12} className="text-[#f5c542]" /> Chef :{' '}
                  <Link
                    to={`/app/leaderboard/${guild.leader.userId}`}
                    className="font-medium text-ink hover:text-accent"
                  >
                    {guild.leader.username}
                  </Link>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> Fondée le {createdAt}
              </span>
            </p>
          </div>
        </div>

        {/* ── Action selon ma relation à la guilde ── */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {relation.kind === 'member' ? (
            <>
              <Badge variant="accent">
                <Users size={12} /> Ta guilde · {GUILD_ROLE_LABELS[relation.role]}
              </Badge>
              <Link to="/app/guilds">
                <Button size="sm">Ouvrir ma guilde</Button>
              </Link>
            </>
          ) : relation.kind === 'invited' ? (
            <Button
              size="sm"
              loading={acceptInvitation.isPending}
              onClick={() => acceptInvitation.mutate(relation.invitationId)}
            >
              Accepter l'invitation
            </Button>
          ) : relation.kind === 'request_pending' ? (
            <>
              <Badge className="bg-surface-2 text-muted">
                <Clock size={12} /> Demande en attente
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                loading={cancelRequest.isPending}
                onClick={() => cancelRequest.mutate(relation.requestId)}
              >
                <X size={14} /> Annuler la demande
              </Button>
            </>
          ) : full ? (
            <Badge variant="outline" className="text-sm">
              Guilde complète ({guild.memberCount}/{guild.maxMembers})
            </Badge>
          ) : (
            <Button size="sm" loading={join.isPending} onClick={() => join.mutate()}>
              <Users size={14} />
              {guild.isOpen ? 'Rejoindre la guilde' : 'Demander à rejoindre'}
            </Button>
          )}
          <span className="flex-1" />
          <Link to={`/app/guilds/${guild.id}/stats`}>
            <Button size="sm" variant="secondary">
              <TrendingUp size={14} /> Statistiques
            </Button>
          </Link>
        </div>
        {(join.error ?? acceptInvitation.error) && (
          <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {(join.error ?? acceptInvitation.error)?.message}
          </p>
        )}
        {join.isSuccess && join.data.status === 'requested' && (
          <p className="mt-3 rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">
            Demande envoyée ! Le chef ou un officier doit l'accepter.
          </p>
        )}
      </Card>

      {/* ── Statistiques ── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={Users}
          label="Membres"
          value={`${guild.memberCount}/${guild.maxMembers}`}
        />
        <StatTile
          icon={Trophy}
          label="XP totale"
          value={guild.totals.totalXp.toLocaleString('fr-FR')}
        />
        <StatTile icon={TrendingUp} label="Niveau moyen" value={String(guild.totals.avgLevel)} />
        <StatTile
          icon={Swords}
          label="Quêtes réalisées"
          value={guild.totals.questsDone.toLocaleString('fr-FR')}
        />
        <StatTile icon={Flame} label="Série moyenne" value={`${guild.totals.avgStreak} j`} />
        <StatTile
          icon={Trophy}
          label="Score global"
          value={guild.totals.score.toLocaleString('fr-FR')}
        />
      </div>

      {/* ── Membres ── */}
      <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
        <Users size={15} className="text-accent" /> Membres · {guild.memberCount}
      </h2>
      <ul className="mt-3 space-y-2">
        {guild.members.map((member) => (
          <li key={member.userId}>
            <Link
              to={`/app/leaderboard/${member.userId}`}
              title={`Voir le profil public de ${member.username}`}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent/50 hover:bg-surface-2"
            >
              <Avatar src={member.avatarUrl} name={member.username} size={36} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  {member.username}
                  <RoleBadge role={member.role} />
                </p>
                <p className="text-xs text-muted tabular-nums">Niveau {member.level}</p>
              </div>
              {member.currentStreak > 0 && (
                <Badge variant="warning" title="Série d'activité">
                  <Flame size={11} /> {member.currentStreak} j
                </Badge>
              )}
              <p className="w-20 shrink-0 text-right text-sm font-bold text-accent tabular-nums">
                {member.totalXp.toLocaleString('fr-FR')} XP
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
