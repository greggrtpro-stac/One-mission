/** Date locale du jour au format YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-07-04" → "ven. 4 juil." */
export function formatDayFr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Position d'une date (YYYY-MM-DD) par rapport à aujourd'hui. */
export function relativeDay(iso: string): 'past' | 'today' | 'tomorrow' | 'future' {
  const today = todayIso()
  if (iso < today) return 'past'
  if (iso === today) return 'today'

  const [y, m, d] = today.split('-').map(Number)
  const t = new Date(y!, m! - 1, d! + 1)
  const tomorrow = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  return iso === tomorrow ? 'tomorrow' : 'future'
}
