/** Helpers de dates de la Routine — semaine lundi→dimanche, heure locale. */

/** Lundi 00:00 (local) de la semaine contenant `date`. */
export function currentWeekStart(date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const shift = (d.getDay() + 6) % 7 // lundi = 0
  d.setDate(d.getDate() - shift)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Index du jour courant dans la semaine (0 = lundi … 6 = dimanche). */
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

/** « 6 au 12 juillet », avec l'année seulement si la semaine n'est pas dans l'année en cours. */
export function formatWeekRangeFr(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const sameMonth =
    weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear()
  const startLabel = sameMonth
    ? String(weekStart.getDate())
    : weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const endLabel = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const yearSuffix = end.getFullYear() !== new Date().getFullYear() ? ` ${end.getFullYear()}` : ''
  return `${startLabel} au ${endLabel}${yearSuffix}`
}
