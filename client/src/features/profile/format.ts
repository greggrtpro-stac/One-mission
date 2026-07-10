import { levelFromTotalXp, type ProfileDay } from '@one-mission/shared'

/** Helpers de formatage et de séries, partagés entre Profil et profil public. */

export function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function formatXp(xp: number): string {
  return xp.toLocaleString('fr-FR')
}

/**
 * Reconstitue l'XP totale jour par jour (en remontant depuis aujourd'hui),
 * puis en déduit le niveau — base des graphiques « évolution » et « niveau ».
 */
export function buildXpLevelSeries(totalXp: number, days: ProfileDay[]) {
  let running = totalXp
  const reversed = [...days].reverse().map((d) => {
    const point = { date: d.date, xp: Math.max(0, running) }
    running -= d.xpGained
    return point
  })
  const xpSeries = reversed.reverse()
  const levelSeries = xpSeries.map((p) => ({ date: p.date, level: levelFromTotalXp(p.xp).level }))
  return { xpSeries, levelSeries }
}
