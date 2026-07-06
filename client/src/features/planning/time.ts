/** Helpers de dates du Planning — tout est calculé en heure locale de l'utilisateur. */

export const MINUTES_PER_DAY = 24 * 60

/** Lundi 00:00 (local) de la semaine contenant `date`. */
export function startOfWeek(date: Date): Date {
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

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

/** Les 7 jours de la semaine (lundi → dimanche). */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Minutes écoulées depuis minuit local. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Date locale au format YYYY-MM-DD (pour <input type="date"> et dueDate). */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Heure locale au format HH:mm (pour <input type="time"> et dueTime). */
export function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Reconstruit une Date locale depuis les champs date (YYYY-MM-DD) et heure (HH:mm). */
export function fromInputs(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y!, m! - 1, d!, h ?? 0, min ?? 0)
}

/** Numéro de semaine ISO 8601. */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** « 6 – 12 juillet 2026 » ou « 28 sept. – 4 oct. 2026 » à cheval sur deux mois. */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const startLabel = sameMonth
    ? String(weekStart.getDate())
    : weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

/** « 12 h 30 », « 45 min » — durées lisibles pour les statistiques. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

/** « 09:00 – 10:30 » pour l'affichage des événements. */
export function formatEventRange(start: Date, end: Date): string {
  return `${toTimeInput(start)} – ${toTimeInput(end)}`
}
