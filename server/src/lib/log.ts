import { isProd } from '../config/env.js'

type Level = 'debug' | 'info' | 'warn' | 'error'

/**
 * Journal applicatif : une ligne JSON homogène par événement
 * (`date`, `level`, `event` + données). En production, le niveau `debug`
 * est coupé pour garder des logs propres ; en développement tout est émis.
 * Un collecteur (pino, Datadog, …) pourra remplacer ce module sans toucher
 * aux appelants.
 */
export function log(level: Level, event: string, data: Record<string, unknown> = {}) {
  if (isProd && level === 'debug') return
  const line = JSON.stringify({ date: new Date().toISOString(), level, event, ...data })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}
