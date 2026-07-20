import type { NotificationDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '@/api/http'
import { friendsApi, notificationsApi } from '@/api/friends'
import { Avatar, Button, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

/** Rafraîchissement du centre de notifications (temps réel « suffisant » sans WebSocket). */
const POLL_INTERVAL_MS = 30_000

function timeAgoFr(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'hier' : `il y a ${days} j`
}

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiRequestError)) return undefined
  return (error.details as { code?: string } | undefined)?.code
}

/** Texte + lien de chaque type de notification (amis et guildes). */
function describe(notification: NotificationDto): { text: string; to: string; emoji: string } {
  const data = notification.data ?? {}
  const from = String(data.fromUsername ?? data.username ?? 'Un joueur')
  const guildName = String(data.guildName ?? 'ta guilde')
  const guildEmoji = typeof data.guildIcon === 'string' ? data.guildIcon : '🛡️'
  const guilds = '/app/guilds'

  switch (notification.type) {
    case 'FRIEND_REQUEST_RECEIVED':
      return { emoji: '👋', text: `${from} t'a envoyé une demande d'ami.`, to: '/app/friends' }
    case 'FRIEND_REQUEST_ACCEPTED':
      return { emoji: '🤝', text: `${from} a accepté ta demande d'ami.`, to: '/app/friends' }
    case 'FRIEND_REQUEST_DECLINED':
      return { emoji: '😕', text: `${from} a refusé ta demande d'ami.`, to: '/app/friends' }
    case 'GUILD_INVITATION_RECEIVED':
      return { emoji: guildEmoji, text: `${from} t'invite à rejoindre ${guildName}.`, to: guilds }
    case 'GUILD_REQUEST_RECEIVED':
      return { emoji: guildEmoji, text: `${from} demande à rejoindre ${guildName}.`, to: guilds }
    case 'GUILD_REQUEST_ACCEPTED':
      return { emoji: '🎉', text: `Ta demande pour ${guildName} a été acceptée !`, to: guilds }
    case 'GUILD_REQUEST_DECLINED':
      return { emoji: '😕', text: `Ta demande pour ${guildName} a été refusée.`, to: guilds }
    case 'GUILD_MEMBER_JOINED':
      return { emoji: guildEmoji, text: `${from} a rejoint ${guildName}.`, to: guilds }
    case 'GUILD_MEMBER_LEFT':
      return { emoji: guildEmoji, text: `${from} a quitté ${guildName}.`, to: guilds }
    case 'GUILD_PROMOTED_OFFICER':
      return { emoji: '⚔️', text: `Tu es maintenant officier de ${guildName} !`, to: guilds }
    case 'GUILD_DEMOTED_OFFICER':
      return { emoji: guildEmoji, text: `Tu n'es plus officier de ${guildName}.`, to: guilds }
    case 'GUILD_LEADERSHIP_TRANSFERRED':
      return { emoji: '👑', text: `Tu es maintenant chef de ${guildName} !`, to: guilds }
    case 'GUILD_KICKED':
      return { emoji: '🚪', text: `Tu as été expulsé de ${guildName}.`, to: guilds }
    default:
      return { emoji: '🔔', text: 'Nouvelle notification.', to: '/app' }
  }
}

/**
 * Avatar de l'auteur de l'événement, quel que soit le type — générique :
 * tout type de notification qui pose `fromUsername`/`fromAvatarUrl` dans sa
 * charge utile en bénéficie automatiquement, sans liste de cas à maintenir ici.
 */
function fromPlayer(notification: NotificationDto): { name: string; src: string | null } | null {
  const data = notification.data ?? {}
  if (typeof data.fromUsername !== 'string') return null
  const src = typeof data.fromAvatarUrl === 'string' ? data.fromAvatarUrl : null
  return { name: data.fromUsername, src }
}

/**
 * Accepter / refuser une demande d'ami directement depuis sa notification,
 * sans repasser par la recherche du joueur. `requestId` vient de la charge
 * utile posée à l'envoi de la demande (voir friends.service.ts#sendRequest).
 */
function FriendRequestQuickActions({
  requestId,
  onDone,
}: {
  requestId: string
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [resolved, setResolved] = useState<'accepted' | 'declined' | 'gone' | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['friends'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  function handleError(err: unknown) {
    // La demande a déjà été traitée ailleurs (page Amis, autre appareil) :
    // état informatif plutôt qu'une erreur, plus rien à faire ici.
    if (errorCode(err) === 'REQUEST_NOT_FOUND') setResolved('gone')
  }

  const accept = useMutation({
    mutationFn: () => friendsApi.acceptRequest(requestId),
    onSuccess: () => {
      setResolved('accepted')
      invalidate()
      onDone()
    },
    onError: handleError,
  })
  const decline = useMutation({
    mutationFn: () => friendsApi.declineRequest(requestId),
    onSuccess: () => {
      setResolved('declined')
      invalidate()
      onDone()
    },
    onError: handleError,
  })

  if (resolved === 'accepted') return <p className="mt-2 text-xs text-success">Demande acceptée.</p>
  if (resolved === 'declined') return <p className="mt-2 text-xs text-muted">Demande refusée.</p>
  if (resolved === 'gone') {
    return <p className="mt-2 text-xs text-faint">Cette demande n’est plus disponible.</p>
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        loading={accept.isPending}
        disabled={decline.isPending}
        onClick={() => accept.mutate()}
      >
        <Check size={14} /> Accepter
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={decline.isPending}
        disabled={accept.isPending}
        onClick={() => decline.mutate()}
      >
        <X size={14} /> Refuser
      </Button>
    </div>
  )
}

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: NotificationDto
  onNavigate: (to: string) => void
}) {
  const queryClient = useQueryClient()
  const markRead = useMutation({
    mutationFn: () => notificationsApi.markRead(notification.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const { text, to, emoji } = describe(notification)
  const player = fromPlayer(notification)
  const unread = notification.readAt === null
  // resolved : posé côté serveur dès que la demande n'est plus en attente
  // (acceptée, refusée, ou annulée par l'expéditeur) — y compris après un
  // rechargement, où l'état local du composant ne suffit pas à le savoir.
  const requestId =
    notification.type === 'FRIEND_REQUEST_RECEIVED' &&
    notification.data?.resolved !== true &&
    typeof notification.data?.requestId === 'string'
      ? notification.data.requestId
      : null

  function openTarget() {
    if (unread) markRead.mutate()
    onNavigate(to)
  }

  return (
    <li className={cn('px-4 py-3 transition-colors hover:bg-surface-2', unread && 'bg-accent-soft/40')}>
      <button type="button" onClick={openTarget} className="flex w-full items-start gap-3 text-left text-sm">
        {player ? (
          <Avatar src={player.src} name={player.name} size={32} className="mt-0.5 shrink-0" />
        ) : (
          <span className="mt-0.5 text-base leading-none" aria-hidden>
            {emoji}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-ink">{text}</span>
          <span className="mt-0.5 block text-xs text-faint">{timeAgoFr(notification.createdAt)}</span>
        </span>
        {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Non lue" />}
      </button>

      {requestId && <FriendRequestQuickActions requestId={requestId} onDone={() => markRead.mutate()} />}
    </li>
  )
}

/**
 * Centre de notifications du header : compteur de non-lues, panneau
 * déroulant, actions rapides pour les demandes d'amis. Alimenté par les
 * événements amis et guildes créés côté serveur ; conçu pour accueillir tout
 * futur type (succès, rappels, récompenses…) sans changement de structure.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: POLL_INTERVAL_MS,
  })
  const unread = query.data?.unreadCount ?? 0

  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Clic hors du panneau : fermeture.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function handleNavigate(to: string) {
    setOpen(false)
    navigate(to)
  }

  const notifications = query.data?.notifications ?? []

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unread > 0 ? `Notifications (${unread} non lue${unread > 1 ? 's' : ''})` : 'Notifications'
        }
        aria-expanded={open}
        className={cn(
          'relative rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink',
          open && 'bg-surface-2 text-ink',
        )}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => readAll.mutate()}
                  disabled={readAll.isPending}
                  className="text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {query.isPending ? (
                <div className="flex justify-center py-8">
                  <Spinner className="text-accent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <BellOff size={22} className="text-faint" />
                  <p className="mt-2 text-sm text-muted">Aucune notification</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
