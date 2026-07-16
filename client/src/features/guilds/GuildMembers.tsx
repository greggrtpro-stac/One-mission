import type { GuildDto, GuildMemberDto, GuildRole } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, Flame, ShieldMinus, ShieldPlus, UserX } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { guildsApi } from '@/api/guilds'
import { Avatar, Badge, ConfirmDialog } from '@/components/ui'
import { RoleBadge } from './GuildIcon'

type PendingAction =
  | { kind: 'kick'; member: GuildMemberDto }
  | { kind: 'transfer'; member: GuildMemberDto }

/**
 * Membres de la guilde avec les actions de gestion selon MON rôle :
 * le chef promeut/rétrograde/expulse/transfère, un officier expulse les
 * membres simples — le serveur revérifie chaque règle de toute façon.
 */
export function GuildMembers({ guild, myRole }: { guild: GuildDto; myRole: GuildRole | null }) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingAction | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
    void queryClient.invalidateQueries({ queryKey: ['guild', guild.id] })
    void queryClient.invalidateQueries({ queryKey: ['guild-leaderboard'] })
  }

  const promote = useMutation({
    mutationFn: (userId: string) => guildsApi.promote(guild.id, userId),
    onSuccess: invalidate,
  })
  const demote = useMutation({
    mutationFn: (userId: string) => guildsApi.demote(guild.id, userId),
    onSuccess: invalidate,
  })
  const kick = useMutation({
    mutationFn: (userId: string) => guildsApi.kick(guild.id, userId),
    onSuccess: () => {
      setPending(null)
      invalidate()
    },
  })
  const transfer = useMutation({
    mutationFn: (userId: string) => guildsApi.transfer(guild.id, userId),
    onSuccess: () => {
      setPending(null)
      invalidate()
    },
  })

  const iAmLeader = myRole === 'LEADER'
  const iAmOfficer = myRole === 'OFFICER'

  return (
    <>
      <ul className="space-y-2">
        {guild.members.map((member) => {
          const canKick =
            (iAmLeader && member.role !== 'LEADER') || (iAmOfficer && member.role === 'MEMBER')
          return (
            <li
              key={member.userId}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <Link
                to={`/app/leaderboard/${member.userId}`}
                className="flex min-w-0 flex-1 items-center gap-3"
                title={`Voir le profil public de ${member.username}`}
              >
                <Avatar src={member.avatarUrl} name={member.username} size={36} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">
                    {member.username}
                    <RoleBadge role={member.role} />
                  </p>
                  <p className="text-xs text-muted tabular-nums">
                    Niveau {member.level} · {member.totalXp.toLocaleString('fr-FR')} XP
                  </p>
                </div>
              </Link>

              {member.currentStreak > 0 && (
                <Badge variant="warning" title="Série d'activité">
                  <Flame size={11} /> {member.currentStreak} j
                </Badge>
              )}

              {(iAmLeader || iAmOfficer) && (
                <span className="flex shrink-0 gap-0.5">
                  {iAmLeader && member.role === 'MEMBER' && (
                    <button
                      type="button"
                      onClick={() => promote.mutate(member.userId)}
                      title={`Promouvoir ${member.username} officier`}
                      aria-label={`Promouvoir ${member.username} officier`}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                    >
                      <ShieldPlus size={15} />
                    </button>
                  )}
                  {iAmLeader && member.role === 'OFFICER' && (
                    <button
                      type="button"
                      onClick={() => demote.mutate(member.userId)}
                      title={`Rétrograder ${member.username}`}
                      aria-label={`Rétrograder ${member.username}`}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <ShieldMinus size={15} />
                    </button>
                  )}
                  {iAmLeader && member.role !== 'LEADER' && (
                    <button
                      type="button"
                      onClick={() => setPending({ kind: 'transfer', member })}
                      title={`Transférer la propriété à ${member.username}`}
                      aria-label={`Transférer la propriété à ${member.username}`}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-warning-soft hover:text-warning"
                    >
                      <Crown size={15} />
                    </button>
                  )}
                  {canKick && (
                    <button
                      type="button"
                      onClick={() => setPending({ kind: 'kick', member })}
                      title={`Expulser ${member.username}`}
                      aria-label={`Expulser ${member.username}`}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <UserX size={15} />
                    </button>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={pending?.kind === 'kick'}
        onClose={() => setPending(null)}
        onConfirm={() => pending && kick.mutate(pending.member.userId)}
        icon={UserX}
        tone="danger"
        title="Expulser ce membre ?"
        description={
          <>
            <b>{pending?.member.username}</b> sera retiré de la guilde. Il pourra la rejoindre à
            nouveau plus tard.
          </>
        }
        confirmLabel="Expulser"
        loading={kick.isPending}
      />

      <ConfirmDialog
        open={pending?.kind === 'transfer'}
        onClose={() => setPending(null)}
        onConfirm={() => pending && transfer.mutate(pending.member.userId)}
        icon={Crown}
        tone="warning"
        title="Transférer la propriété ?"
        description={
          <>
            <b>{pending?.member.username}</b> deviendra chef de la guilde. Tu resteras membre avec
            le rang d'officier.
          </>
        }
        confirmLabel="Transférer"
        loading={transfer.isPending}
      />
    </>
  )
}
