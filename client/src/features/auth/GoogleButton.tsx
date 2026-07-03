import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchGoogleClientId, loginWithGoogle } from '@/api/auth'
import { useThemeStore } from '@/stores/theme'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (el: HTMLElement, options: object) => void
        }
      }
    }
  }
}

let gsiScriptPromise: Promise<void> | null = null

function loadGsiScript(): Promise<void> {
  gsiScriptPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve()
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Impossible de charger Google Sign-In'))
    document.head.appendChild(script)
  })
  return gsiScriptPromise
}

interface GoogleButtonProps {
  onError?: (message: string) => void
}

/** Bouton « Continuer avec Google » — rendu uniquement si le serveur est configuré. */
export function GoogleButton({ onError }: GoogleButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)

  const { data } = useQuery({
    queryKey: ['google-client-id'],
    queryFn: fetchGoogleClientId,
    staleTime: Infinity,
  })
  const clientId = data?.clientId

  useEffect(() => {
    if (!clientId || !containerRef.current) return
    let cancelled = false

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              await loginWithGoogle(response.credential)
              navigate('/app')
            } catch (e) {
              onError?.(e instanceof Error ? e.message : 'Connexion Google impossible')
            }
          },
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          width: 384,
          text: 'continue_with',
          locale: 'fr',
        })
      })
      .catch((e: Error) => onError?.(e.message))

    return () => {
      cancelled = true
    }
  }, [clientId, theme, navigate, onError])

  if (!clientId) return null

  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={containerRef} className="flex justify-center" />
    </>
  )
}
