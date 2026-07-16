import type { NotificationDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationsApi } from '@/api/friends'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

/** Rafraîchissement du compteur de notifications (30 s). */
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
 * Centre de notifications du header : compteur de non-lues, panneau
 * déroulant, tout est marqué lu à l'ouverture. Alimenté par les événements
 * amis et guildes créés côté serveur.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
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

  function toggle() {
    const next = !open
    setOpen(next)
    // Ouvrir le panneau vaut lecture de tout ce qu'il contient.
    if (next && unread > 0) readAll.mutate()
  }

  const notifications = query.data?.notifications ?? []

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
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
            <p className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</p>
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
                  {notifications.map((notification) => {
                    const { text, to, emoji } = describe(notification)
                    return (
                      <li key={notification.id}>
                        <Link
                          to={to}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2',
                            notification.readAt === null && 'bg-accent-soft/40',
                          )}
                        >
                          <span className="mt-0.5 text-base leading-none" aria-hidden>
                            {emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-ink">{text}</span>
                            <span className="mt-0.5 block text-xs text-faint">
                              {timeAgoFr(notification.createdAt)}
                            </span>
                          </span>
                          {notification.readAt === null && (
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
                              aria-label="Non lue"
                            />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
