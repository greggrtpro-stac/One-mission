import { log } from './log.js'

/**
 * Défense anti force brute sur la connexion, par adresse IP :
 *  1. les premiers échecs sont gratuits ;
 *  2. ensuite chaque tentative est ralentie progressivement (1 s, 2 s, 4 s… 8 s max) ;
 *  3. au-delà de {@link BLOCK_AFTER} échecs, l'IP est bloquée {@link BLOCK_MS}.
 *
 * État en mémoire : l'application tourne en mono-processus (voir app.ts).
 * Pour un déploiement multi-instances, ce module devra s'appuyer sur Redis.
 */

const WINDOW_MS = 15 * 60 * 1000 // fenêtre d'observation des échecs
const DELAY_AFTER = 3 // échecs « gratuits » avant ralentissement
const MAX_DELAY_MS = 8_000
const BLOCK_AFTER = 10 // échecs avant blocage temporaire
const BLOCK_MS = 15 * 60 * 1000

interface Entry {
  fails: number
  windowStartedAt: number
  blockedUntil: number | null
}

const entries = new Map<string, Entry>()

/** Purge périodique des IP inactives (fenêtre et blocage expirés). */
const SWEEP_MS = 10 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, e] of entries) {
    const windowOver = now - e.windowStartedAt > WINDOW_MS
    const blockOver = !e.blockedUntil || e.blockedUntil < now
    if (windowOver && blockOver) entries.delete(key)
  }
}, SWEEP_MS).unref()

function entryFor(ip: string): Entry | undefined {
  const e = entries.get(ip)
  if (!e) return undefined
  // Fenêtre expirée et pas de blocage en cours : repart de zéro.
  if (Date.now() - e.windowStartedAt > WINDOW_MS && (!e.blockedUntil || e.blockedUntil < Date.now())) {
    entries.delete(ip)
    return undefined
  }
  return e
}

/** Secondes restantes si l'IP est bloquée, sinon null. */
export function blockedForSeconds(ip: string): number | null {
  const e = entryFor(ip)
  if (!e?.blockedUntil) return null
  const remaining = e.blockedUntil - Date.now()
  return remaining > 0 ? Math.ceil(remaining / 1000) : null
}

/** Délai de ralentissement à appliquer avant de traiter la tentative. */
export function delayForMs(ip: string): number {
  const e = entryFor(ip)
  if (!e || e.fails < DELAY_AFTER) return 0
  return Math.min(1000 * 2 ** (e.fails - DELAY_AFTER), MAX_DELAY_MS)
}

export function recordFailure(ip: string): void {
  const now = Date.now()
  const e = entryFor(ip) ?? { fails: 0, windowStartedAt: now, blockedUntil: null }
  e.fails += 1
  if (e.fails >= BLOCK_AFTER) {
    e.blockedUntil = now + BLOCK_MS
    // Signal de sécurité : blocage journalisé (IP seule, aucune donnée personnelle).
    log('warn', 'auth.throttle.blocked', { ip, fails: e.fails })
  }
  entries.set(ip, e)
}

/** Une connexion réussie remet le compteur de l'IP à zéro. */
export function recordSuccess(ip: string): void {
  entries.delete(ip)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
