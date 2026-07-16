import type { GuildLeaderboardEntry } from '@one-mission/shared'
import { ChevronRight, Crown, Flame, Lock, Swords, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { GuildIcon } from './GuildIcon'

const PODIUM_STYLES = [
  'text-[#f5c542]', // or
  'text-[#a8b0bd]', // argent
  'text-[#c98a4b]', // bronze
]

/** Ligne du classement des guildes — toute la carte ouvre la fiche. */
export function GuildRow({ entry }: { entry: GuildLeaderboardEntry }) {
  const podium = entry.rank <= 3
  const full = entry.memberCount >= entry.maxMembers
  return (
    <li>
      <Link
        to={`/app/guilds/${entry.id}`}
        title={`Voir la guilde ${entry.name}`}
        className={cn(
          'group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
          entry.isMine
            ? 'border-accent bg-accent-soft hover:bg-accent-soft/80'
            : 'border-line bg-surface hover:border-accent/50 hover:bg-surface-2',
        )}
      >
        <span className="flex w-8 shrink-0 items-center justify-center">
          {podium ? (
            <Crown size={20} className={PODIUM_STYLES[entry.rank - 1]} fill="currentColor" />
          ) : (
            <span className="text-sm font-bold text-muted tabular-nums">{entry.rank}</span>
          )}
        </span>
        <GuildIcon icon={entry.icon} color={entry.color} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {entry.name}
            {entry.isMine && <span className="text-xs font-medium text-accent">(ta guilde)</span>}
            {!entry.isOpen && (
              <Lock size={11} className="shrink-0 text-faint" aria-label="Sur demande" />
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Users size={11} /> {entry.memberCount}/{entry.maxMembers}
            </span>
            <span title="Niveau moyen">Nv. moy. {entry.avgLevel}</span>
            <span className="hidden items-center gap-1 sm:inline-flex" title="Quêtes terminées">
              <Swords size={11} /> {entry.questsDone.toLocaleString('fr-FR')}
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex" title="Série cumulée">
              <Flame size={11} /> {entry.totalStreak} j
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-accent tabular-nums">
            {entry.score.toLocaleString('fr-FR')}
          </p>
          <p className="text-[10px] text-faint">
            score · {entry.totalXp.toLocaleString('fr-FR')} XP
          </p>
        </div>
        {full ? (
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            Complète
          </Badge>
        ) : null}
        <ChevronRight
          size={16}
          className="shrink-0 text-faint transition-colors group-hover:text-accent"
        />
      </Link>
    </li>
  )
}
