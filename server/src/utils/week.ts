/** Lundi 00:00 UTC de la semaine courante — référence des quêtes hebdomadaires. */
export function currentWeekStart(now = new Date()): Date {
  const day = now.getUTCDay() // 0 = dimanche
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff))
  return monday
}
