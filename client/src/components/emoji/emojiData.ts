/**
 * Jeu de données du sélecteur d'emoji — importé UNIQUEMENT en dynamique
 * (voir EmojiPicker) : les ~590 Ko de données Unicode restent dans leur
 * propre chunk et ne pèsent jamais sur le chargement initial du Planning.
 */
import raw from 'emojibase-data/fr/compact.json'

export interface EmojiEntry {
  label: string
  unicode: string
  hexcode: string
  tags?: string[]
  group?: number
  order?: number
}

/** Groupes Unicode affichés, dans l'ordre standard (le groupe 2 — composants
 * de teint de peau — n'est pas sélectionnable et est exclu). */
export const EMOJI_GROUPS: ReadonlyArray<{ id: number; label: string }> = [
  { id: 0, label: 'Smileys et émotions' },
  { id: 1, label: 'Personnes et corps' },
  { id: 3, label: 'Animaux et nature' },
  { id: 4, label: 'Nourriture et boissons' },
  { id: 5, label: 'Voyages et lieux' },
  { id: 6, label: 'Activités' },
  { id: 7, label: 'Objets' },
  { id: 8, label: 'Symboles' },
  { id: 9, label: 'Drapeaux' },
]

const GROUP_IDS = new Set(EMOJI_GROUPS.map((g) => g.id))

export const EMOJIS: EmojiEntry[] = raw
  .filter((e): e is EmojiEntry & { group: number } => e.group !== undefined && GROUP_IDS.has(e.group))
  .sort((a, b) => a.group - b.group || (a.order ?? 0) - (b.order ?? 0))
