import type { GuildMessageDto, GuildMessagesResponse } from '@one-mission/shared'
import { GUILD_MESSAGE_MAX_LENGTH } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CornerUpLeft, History, SendHorizontal, Smile, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { guildsApi } from '@/api/guilds'
import { EmojiPicker } from '@/components/emoji/EmojiPicker'
import { Avatar, Button, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'

/** Intervalle du « temps réel » : le chat se rafraîchit toutes les 4 s. */
const POLL_INTERVAL_MS = 4_000

function timeFr(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function MessageRow({
  message,
  isMine,
  onReply,
  onDelete,
}: {
  message: GuildMessageDto
  isMine: boolean
  onReply: () => void
  onDelete: () => void
}) {
  const username = message.author?.username ?? 'Joueur supprimé'
  return (
    <div className={cn('group flex gap-2.5', isMine && 'flex-row-reverse')}>
      <Avatar src={message.author?.avatarUrl ?? null} name={username} size={30} />
      <div className={cn('min-w-0 max-w-[78%]', isMine && 'flex flex-col items-end')}>
        <p className={cn('flex items-baseline gap-2 text-xs', isMine && 'flex-row-reverse')}>
          <span className="font-semibold text-ink">{username}</span>
          <span className="text-faint tabular-nums">{timeFr(message.createdAt)}</span>
        </p>
        {message.replyTo && (
          <p
            className="mt-1 w-fit max-w-full truncate rounded-lg border-l-2 border-accent bg-surface-2 px-2.5 py-1 text-xs text-muted"
            title={message.replyTo.excerpt}
          >
            <span className="font-medium">{message.replyTo.username ?? 'Joueur supprimé'}</span> —{' '}
            {message.replyTo.excerpt}
          </p>
        )}
        <div className={cn('mt-1 flex items-center gap-1.5', isMine && 'flex-row-reverse')}>
          <p
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap',
              isMine ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink',
            )}
          >
            {message.content}
          </p>
          <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
            <button
              type="button"
              onClick={onReply}
              aria-label={`Répondre à ${username}`}
              title="Répondre"
              className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <CornerUpLeft size={13} />
            </button>
            {message.canDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="Supprimer le message"
                title="Supprimer"
                className="rounded-lg p-1.5 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 size={13} />
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Chat privé de la guilde — réservé aux membres. Rafraîchi en continu par
 * interrogation courte (voir guild-chat.service.ts côté serveur), avec
 * pagination vers le haut, réponses citées et suppression selon les droits.
 */
export function GuildChat({ guildId }: { guildId: string }) {
  const meId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<GuildMessageDto | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastSeenIdRef = useRef<string | null>(null)

  const queryKey = ['guild-messages', guildId]
  const query = useQuery({
    queryKey,
    queryFn: () => guildsApi.messages(guildId),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const data = query.data

  // Défilement : colle en bas à l'arrivée de nouveaux messages, sauf si le
  // joueur est remonté lire l'historique (on ne lui vole pas sa position).
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !data) return
    const lastId = data.messages[data.messages.length - 1]?.id ?? null
    if (lastId === lastSeenIdRef.current) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (lastSeenIdRef.current === null || nearBottom) {
      el.scrollTop = el.scrollHeight
    }
    lastSeenIdRef.current = lastId

    // Lu : remet le compteur de non-lus à zéro (badge de l'onglet).
    void guildsApi.markRead(guildId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
    })
  }, [data, guildId, queryClient])

  const send = useMutation({
    mutationFn: () => guildsApi.postMessage(guildId, draft.trim(), replyTo?.id),
    onSuccess: ({ message }) => {
      setDraft('')
      setReplyTo(null)
      // Ajout immédiat au cache : le message apparaît sans attendre le poll.
      queryClient.setQueryData<GuildMessagesResponse>(queryKey, (old) =>
        old ? { ...old, messages: [...old.messages, message] } : old,
      )
    },
  })

  const remove = useMutation({
    mutationFn: (messageId: string) => guildsApi.deleteMessage(guildId, messageId),
    onSuccess: (_res, messageId) => {
      queryClient.setQueryData<GuildMessagesResponse>(queryKey, (old) =>
        old ? { ...old, messages: old.messages.filter((m) => m.id !== messageId) } : old,
      )
    },
  })

  async function loadOlder() {
    if (!data?.oldestId || loadingOlder) return
    setLoadingOlder(true)
    try {
      const older = await guildsApi.messages(guildId, data.oldestId)
      queryClient.setQueryData<GuildMessagesResponse>(queryKey, (old) =>
        old
          ? {
              messages: [...older.messages, ...old.messages],
              oldestId: older.oldestId ?? old.oldestId,
              hasMore: older.hasMore,
            }
          : old,
      )
    } finally {
      setLoadingOlder(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (draft.trim().length === 0 || send.isPending) return
    send.mutate()
  }

  // Séparateur de jour inséré au fil du rendu.
  let previousDay = ''

  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {query.isPending ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="text-accent" />
          </div>
        ) : !data || data.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-2xl" aria-hidden>
              💬
            </p>
            <p className="mt-2 text-sm font-medium">Aucun message pour l'instant</p>
            <p className="mt-1 text-sm text-muted">Lance la conversation avec ta guilde !</p>
          </div>
        ) : (
          <>
            {data.hasMore && (
              <div className="flex justify-center">
                <Button size="sm" variant="ghost" loading={loadingOlder} onClick={loadOlder}>
                  <History size={14} /> Messages précédents
                </Button>
              </div>
            )}
            {data.messages.map((message) => {
              const day = dayKey(message.createdAt)
              const showDay = day !== previousDay
              previousDay = day
              return (
                <div key={message.id} className="space-y-4">
                  {showDay && (
                    <p className="text-center text-[11px] font-medium text-faint">{day}</p>
                  )}
                  <MessageRow
                    message={message}
                    isMine={message.author?.userId === meId}
                    onReply={() => setReplyTo(message)}
                    onDelete={() => remove.mutate(message.id)}
                  />
                </div>
              )
            })}
          </>
        )}
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 border-t border-line bg-surface-2 px-4 py-2 text-xs">
          <CornerUpLeft size={13} className="shrink-0 text-accent" />
          <p className="min-w-0 flex-1 truncate text-muted">
            Réponse à <b className="text-ink">{replyTo.author?.username ?? 'Joueur supprimé'}</b> —{' '}
            {replyTo.content}
          </p>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            aria-label="Annuler la réponse"
            className="rounded p-1 text-muted hover:bg-surface-3 hover:text-ink"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {send.error && (
        <p className="border-t border-line bg-danger-soft px-4 py-2 text-xs text-danger">
          {send.error instanceof Error ? send.error.message : 'Erreur d’envoi'}
        </p>
      )}

      <form onSubmit={handleSubmit} className="relative border-t border-line p-3">
        {emojiOpen && (
          <div className="absolute right-3 bottom-full z-10 mb-2 w-72 rounded-2xl border border-line bg-surface p-3 shadow-2xl">
            <EmojiPicker
              value=""
              onSelect={(emoji) => {
                setDraft((d) => d + emoji)
                setEmojiOpen(false)
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={GUILD_MESSAGE_MAX_LENGTH}
            placeholder="Écris à ta guilde…"
            aria-label="Message"
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3.5 text-sm placeholder:text-faint focus:border-transparent focus:ring-2 focus:ring-accent/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            aria-label="Insérer un emoji"
            aria-expanded={emojiOpen}
            className={cn(
              'rounded-xl p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink',
              emojiOpen && 'bg-accent-soft text-accent',
            )}
          >
            <Smile size={18} />
          </button>
          <Button
            type="submit"
            size="md"
            loading={send.isPending}
            disabled={draft.trim().length === 0}
            aria-label="Envoyer"
          >
            <SendHorizontal size={16} />
          </Button>
        </div>
      </form>
    </div>
  )
}
