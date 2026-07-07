export interface ParsedUserAgent {
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os: string | null
  browser: string | null
}

/**
 * Extraction volontairement minimaliste (pas de dépendance) : suffisante pour
 * l'écran « Appareils connectés ». L'ordre des tests compte — les UA Chrome
 * contiennent « Safari », les UA Edge contiennent « Chrome », etc.
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { device: 'unknown', os: null, browser: null }

  let os: string | null = null
  if (/Windows NT/i.test(ua)) os = 'Windows'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/CrOS/i.test(ua)) os = 'ChromeOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser: string | null = null
  if (/Edg(e|A|iOS)?\//i.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera'
  else if (/SamsungBrowser\//i.test(ua)) browser = 'Samsung Internet'
  else if (/Firefox\/|FxiOS\//i.test(ua)) browser = 'Firefox'
  else if (/CriOS\//i.test(ua)) browser = 'Chrome'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'

  let device: ParsedUserAgent['device'] = 'desktop'
  if (/iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) device = 'tablet'
  else if (/Mobile|iPhone|iPod/i.test(ua)) device = 'mobile'

  return { device, os, browser }
}

/** Libellé de localisation approximative — géolocalisation IP non branchée,
 * on distingue seulement le réseau local ; le champ reste prêt pour un
 * service GeoIP ultérieur. */
export function locationFromIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const normalized = ip.replace(/^::ffff:/, '')
  if (normalized === '::1' || normalized === '127.0.0.1') return 'Cet ordinateur (localhost)'
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(normalized)) return 'Réseau local'
  return null
}
