/**
 * Disponibilité de l'API au démarrage. Les toutes premières requêtes de l'app
 * (/api/auth/refresh du bootstrap, /api/health de la landing) attendent que
 * /api/health réponde, au lieu d'échouer si le backend démarre encore.
 * Promesse unique partagée : une seule vague de sondes quel que soit le nombre
 * d'appelants, et plus aucune sonde une fois l'API vue prête.
 */

const MAX_ATTEMPTS = 40
const RETRY_DELAY_MS = 750

async function ping(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

let readyPromise: Promise<void> | null = null

/**
 * Résout dès que l'API répond. Après ~30 s d'échecs, résout quand même :
 * les appels suivants échouent alors normalement et l'erreur réelle remonte.
 */
export function waitForApiReady(): Promise<void> {
  readyPromise ??= (async () => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (await ping()) return
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  })()
  return readyPromise
}
