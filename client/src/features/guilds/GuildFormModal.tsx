import type { GuildDto } from '@one-mission/shared'
import {
  AUTO_CATEGORY_COLORS,
  DEFAULT_GUILD_COLOR,
  DEFAULT_GUILD_ICON,
  type CreateGuildPayload,
} from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { guildsApi } from '@/api/guilds'
import { EmojiPicker } from '@/components/emoji/EmojiPicker'
import { Button, Input, Modal, Textarea, Toggle } from '@/components/ui'
import { cn } from '@/lib/cn'

interface GuildFormModalProps {
  open: boolean
  onClose: () => void
  /** Absente = création ; présente = édition (chef uniquement). */
  guild?: GuildDto
  onSaved?: (guildId: string) => void
}

/**
 * Création / édition d'une guilde : nom unique, description, emoji (même
 * sélecteur que les catégories), couleur (palette + color picker libre),
 * niveau minimum requis et mode ouvert/fermé.
 */
export function GuildFormModal({ open, onClose, guild, onSaved }: GuildFormModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(guild?.name ?? '')
  const [description, setDescription] = useState(guild?.description ?? '')
  const [icon, setIcon] = useState(guild?.icon ?? DEFAULT_GUILD_ICON)
  const [color, setColor] = useState(guild?.color ?? DEFAULT_GUILD_COLOR)
  const [hexInput, setHexInput] = useState(guild?.color ?? DEFAULT_GUILD_COLOR)
  const [minLevel, setMinLevel] = useState(guild?.minLevel ?? 1)
  const [isOpen, setIsOpen] = useState(guild?.isOpen ?? true)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateGuildPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        minLevel,
        isOpen,
      }
      return guild ? guildsApi.update(guild.id, payload) : guildsApi.create(payload)
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['my-guild'] })
      void queryClient.invalidateQueries({ queryKey: ['guild-leaderboard'] })
      void queryClient.invalidateQueries({ queryKey: ['guild', response.guild.id] })
      onSaved?.(response.guild.id)
      onClose()
    },
  })

  function applyHex(value: string) {
    setHexInput(value)
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) setColor(value)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={guild ? 'Modifier la guilde' : 'Créer une guilde'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nom de la guilde"
          required
          minLength={3}
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. : Les Conquérants"
          autoFocus
          hint="Unique — visible par tous les joueurs."
        />

        <Textarea
          label="Description (facultative)"
          maxLength={500}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Présente ta guilde en quelques mots…"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Couleur principale</span>
          <div className="flex flex-wrap items-center gap-2">
            {AUTO_CATEGORY_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                aria-label={`Couleur ${c.name}`}
                onClick={() => {
                  setColor(c.hex)
                  setHexInput(c.hex)
                }}
                className={cn(
                  'size-7 rounded-full transition-transform hover:scale-110',
                  color === c.hex && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                )}
                style={{ background: c.hex }}
              />
            ))}
            <label
              title="Couleur personnalisée"
              className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-line-strong"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value)
                  setHexInput(e.target.value)
                }}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                aria-label="Choisir une couleur personnalisée"
              />
              <span
                className="pointer-events-none absolute inset-0"
                style={{ background: color }}
              />
            </label>
          </div>
          <Input
            value={hexInput}
            onChange={(e) => applyHex(e.target.value)}
            placeholder={DEFAULT_GUILD_COLOR}
            maxLength={7}
            className="font-mono uppercase"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Emblème</span>
          <button
            type="button"
            onClick={() => setEmojiPickerOpen((v) => !v)}
            aria-expanded={emojiPickerOpen}
            className="flex h-10 w-fit items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-sm transition-colors hover:border-line-strong"
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-muted">
              {emojiPickerOpen ? 'Fermer le sélecteur' : "Changer d'emoji"}
            </span>
            <ChevronDown
              size={14}
              className={cn('text-muted transition-transform', emojiPickerOpen && 'rotate-180')}
            />
          </button>
          {emojiPickerOpen && <EmojiPicker value={icon} onSelect={setIcon} />}
        </div>

        <Input
          label="Niveau minimum requis"
          type="number"
          min={1}
          max={200}
          value={minLevel}
          onChange={(e) => setMinLevel(Math.max(1, Number(e.target.value) || 1))}
          hint="1 = aucun prérequis."
        />

        <Toggle
          checked={isOpen}
          onChange={setIsOpen}
          label="Guilde ouverte"
          description="Ouverte : tout joueur éligible rejoint directement. Fermée : les candidatures passent par une demande d'adhésion."
        />

        {mutation.error && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {mutation.error instanceof Error ? mutation.error.message : 'Erreur'}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {guild ? 'Enregistrer' : 'Créer la guilde'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
