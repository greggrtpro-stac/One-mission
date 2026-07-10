/**
 * Déclaration manuelle du jeu de données emoji (libellés et mots-clés CLDR en
 * français). On ne passe PAS par `resolveJsonModule` : TypeScript parserait
 * les ~590 Ko de JSON à chaque typecheck pour en inférer le type, alors que
 * Vite, lui, sait très bien empaqueter ce fichier dans son propre chunk.
 */
declare module 'emojibase-data/fr/compact.json' {
  export interface CompactEmoji {
    /** Nom français de l'emoji (ex. « livres »). */
    label: string
    /** Le caractère emoji lui-même (séquence Unicode complète). */
    unicode: string
    hexcode: string
    /** Mots-clés français de recherche (ex. « lecture », « bibliothèque »). */
    tags?: string[]
    /** Groupe Unicode (0 smileys … 9 drapeaux) ; absent pour les composants. */
    group?: number
    order?: number
  }

  const emojis: CompactEmoji[]
  export default emojis
}
