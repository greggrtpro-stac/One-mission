import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { fetchTurnstileSiteKey } from '@/api/auth'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
    }
  }
}

let turnstileScriptPromise: Promise<void> | null = null

/** render=explicit : on contrôle nous-mêmes le rendu via turnstile.render(), pas de scan auto du DOM. */
function loadTurnstileScript(): Promise<void> {
  turnstileScriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve()
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Impossible de charger Cloudflare Turnstile'))
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}

interface TurnstileWidgetProps {
  /**
   * Appelé avec le jeton une fois le défi réussi, `''` si l'anti-robot n'est
   * pas configuré (développement — le serveur ne l'exige pas non plus dans
   * ce cas), ou `null` tant qu'aucun jeton valide n'est disponible (chargement,
   * expiration, erreur) — le formulaire appelant doit bloquer la soumission
   * tant que la valeur est `null`.
   */
  onVerify: (token: string | null) => void
}

/** Widget anti-robot Cloudflare Turnstile — rendu uniquement si le serveur est configuré. */
export function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const { data } = useQuery({
    queryKey: ['turnstile-site-key'],
    queryFn: fetchTurnstileSiteKey,
    staleTime: Infinity,
  })
  const siteKey = data?.siteKey

  useEffect(() => {
    // Encore en chargement : on ne débloque pas le formulaire tant qu'on ne
    // sait pas si un défi est requis.
    if (siteKey === undefined) return
    if (!siteKey) {
      onVerify('')
      return
    }
    if (!containerRef.current) return
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token: string) => onVerify(token),
          'expired-callback': () => onVerify(null),
          'error-callback': () => onVerify(null),
        })
      })
      .catch(() => onVerify(null))

    return () => {
      cancelled = true
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current)
    }
  }, [siteKey, onVerify])

  if (!siteKey) return null
  return <div ref={containerRef} className="flex justify-center py-1" />
}
