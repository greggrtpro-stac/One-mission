import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { guildsApi, type InvitablePlayer } from '@/api/guilds'
import { Avatar, Badge, Button, Input, Modal, Spinner } from '@/components/ui'

function InvitableRow({ player, guildId }: { player: InvitablePlayer; guildId: string }) {
  const queryClient = useQueryClient()
  const invite = useMutation({
    mutationFn: () => guildsApi.invite(guildId, player.userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['guild-invitable'] })
      void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
    },
  })

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <Avatar src={player.avatarUrl} name={player.username} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{player.username}</p>
        <p className="text-xs text-muted">Niveau {player.level}</p>
      </div>
      {player.alreadyInvited ? (
        <Badge className="bg-surface-2 text-muted">
          <Check size={12} /> Invité
        </Badge>
      ) : (
        <Button size="sm" loading={invite.isPending} onClick={() => invite.mutate()}>
          <UserPlus size={14} /> Inviter
        </Button>
      )}
      {invite.error && <p className="w-full text-xs text-danger">{invite.error.message}</p>}
    </li>
  )
}

/** Recherche d'un joueur sans guilde par pseudo, pour l'inviter (chef/officier). */
export function InviteModal({
  open,
  onClose,
  guildId,
}: {
  open: boolean
  onClose: () => void
  guildId: string
}) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])

  const search = useQuery({
    queryKey: ['guild-invitable', guildId, query],
    queryFn: () => guildsApi.searchInvitable(guildId, query),
    enabled: open && query.length >= 2,
  })

  return (
    <Modal open={open} onClose={onClose} title="Inviter un joueur">
      <div className="flex flex-col gap-4">
        <Input
          label="Rechercher un joueur"
          placeholder="Pseudo exact ou partiel…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          trailing={<Search size={16} className="text-muted" />}
          autoFocus
          hint="Seuls les joueurs sans guilde peuvent être invités."
        />
        {query.length >= 2 &&
          (search.isPending ? (
            <div className="flex justify-center py-4">
              <Spinner className="text-accent" />
            </div>
          ) : search.data && search.data.results.length > 0 ? (
            <ul className="space-y-2">
              {search.data.results.map((player) => (
                <InvitableRow key={player.userId} player={player} guildId={guildId} />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted">Aucun joueur disponible pour « {query} ».</p>
          ))}
      </div>
    </Modal>
  )
}
