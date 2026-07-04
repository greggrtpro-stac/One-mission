const DAY_MS = 24 * 60 * 60 * 1000

/** Jours entiers d'abstinence depuis `startDate` (même règle que le serveur). */
export function streakDays(startDateIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startDateIso).getTime()) / DAY_MS))
}
