import { useEffect, useMemo, useState } from 'react'
import { Input, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { EmojiEntry } from './emojiData'

interface EmojiPickerProps {
  /** Emoji actuellement sélectionné. */
  value: string
  onSelect: (emoji: string) => void
}

interface EmojiData {
  emojis: EmojiEntry[]
  groups: ReadonlyArray<{ id: number; label: string }>
}

/** Recherche insensible à la casse et aux accents (« ecole » trouve « école »). */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Sélecteur d'emoji maison : tous les emojis Unicode (données CLDR), recherche
 * par mots-clés français, aperçu au survol. Les données sont chargées
 * paresseusement à la première ouverture — voir emojiData.ts.
 */
export function EmojiPicker({ value, onSelect }: EmojiPickerProps) {
  const [data, setData] = useState<EmojiData | null>(null)
  const [query, setQuery] = useState('')
  const [hovered, setHovered] = useState<EmojiEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('./emojiData').then((mod) => {
      if (!cancelled) setData({ emojis: mod.EMOJIS, groups: mod.EMOJI_GROUPS })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const sections = useMemo(() => {
    if (!data) return []
    const q = normalize(query.trim())
    if (!q) {
      return data.groups.map((group) => ({
        label: group.label,
        items: data.emojis.filter((e) => e.group === group.id),
      }))
    }
    const items = data.emojis.filter(
      (e) => normalize(e.label).includes(q) || e.tags?.some((tag) => normalize(tag).includes(q)),
    )
    return [{ label: `Résultats (${items.length})`, items }]
  }, [data, query])

  const selected = data?.emojis.find((e) => e.unicode === value) ?? null
  const preview = hovered ?? selected

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-2.5">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher (ex. : livre, sport, fusée…)"
        autoFocus
        className="bg-surface"
      />

      {!data ? (
        <div className="flex justify-center py-8">
          <Spinner className="text-accent" />
        </div>
      ) : (
        <div className="max-h-52 overflow-y-auto pr-1" onMouseLeave={() => setHovered(null)}>
          {sections.map((section) => (
            <div key={section.label}>
              <p className="sticky top-0 z-10 bg-surface-2 px-1 py-1 text-[11px] font-semibold text-muted">
                {section.label}
              </p>
              {section.items.length === 0 ? (
                <p className="px-1 pb-2 text-xs text-faint">Aucun emoji ne correspond.</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-0.5">
                  {section.items.map((emoji) => (
                    <button
                      key={emoji.hexcode}
                      type="button"
                      title={emoji.label}
                      aria-label={emoji.label}
                      onClick={() => onSelect(emoji.unicode)}
                      onMouseEnter={() => setHovered(emoji)}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-surface-3',
                        value === emoji.unicode && 'bg-accent-soft ring-1 ring-accent',
                      )}
                    >
                      {emoji.unicode}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aperçu : emoji survolé, sinon la sélection en cours. */}
      <div className="flex min-h-8 items-center gap-2 border-t border-line px-1 pt-2">
        <span className="text-2xl leading-none">{preview?.unicode ?? value}</span>
        <span className="truncate text-xs text-muted capitalize">
          {preview?.label ?? 'Emoji sélectionné'}
        </span>
      </div>
    </div>
  )
}
