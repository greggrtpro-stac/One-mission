import type { GuildRole } from '@one-mission/shared'
import { GUILD_ROLE_LABELS } from '@one-mission/shared'
import { Crown, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'

/** Pastille emoji sur fond teinté à la couleur de la guilde. */
export function GuildIcon({
  icon,
  color,
  size = 40,
  className,
}: {
  icon: string
  color: string
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-xl', className)}
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        fontSize: size * 0.52,
        lineHeight: 1,
      }}
    >
      {icon}
    </span>
  )
}

/** Chip cliquable « guilde du joueur » (profils) : emoji, nom, rôle. */
export function GuildChip({
  guild,
  role,
  className,
}: {
  guild: { id: string; name: string; icon: string; color: string }
  role: GuildRole
  className?: string
}) {
  return (
    <Link
      to={`/app/guilds/${guild.id}`}
      title={`Voir la guilde ${guild.name}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1 text-xs font-medium transition-transform hover:scale-[1.03]',
        className,
      )}
      style={{
        background: `color-mix(in srgb, ${guild.color} 16%, transparent)`,
        color: guild.color,
      }}
    >
      <span className="text-sm leading-none" aria-hidden>
        {guild.icon}
      </span>
      {guild.name}
      <span className="opacity-70">· {GUILD_ROLE_LABELS[role]}</span>
    </Link>
  )
}

/** Badge de rôle : couronne pour le chef, bouclier pour les officiers. */
export function RoleBadge({ role, className }: { role: GuildRole; className?: string }) {
  if (role === 'MEMBER') return null
  return (
    <Badge
      variant={role === 'LEADER' ? 'warning' : 'accent'}
      className={className}
      title={GUILD_ROLE_LABELS[role]}
    >
      {role === 'LEADER' ? <Crown size={11} /> : <Shield size={11} />}
      {GUILD_ROLE_LABELS[role]}
    </Badge>
  )
}
