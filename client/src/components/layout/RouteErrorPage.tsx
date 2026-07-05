import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

/**
 * Remplace l'écran gris par défaut de React Router en cas d'erreur de rendu
 * dans une route (au lieu de laisser l'utilisateur face à une page blanche
 * ou à un message de développeur brut).
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Erreur inconnue'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-ink">
      <span className="text-4xl">⚠️</span>
      <h1 className="text-xl font-bold">Une erreur inattendue est survenue</h1>
      <p className="max-w-md text-sm text-muted">
        Cette page n'a pas pu s'afficher normalement. Recharge la page ; si le problème persiste,
        signale le message ci-dessous.
      </p>
      <pre className="max-w-xl overflow-x-auto rounded-xl border border-line bg-surface-2 px-4 py-3 text-left text-xs text-danger">
        {message}
      </pre>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
      >
        Recharger la page
      </button>
    </div>
  )
}
