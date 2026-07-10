import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Filet de sécurité global : sans lui, la moindre erreur de rendu React
 * (accès à une propriété undefined, hook mal utilisé, etc.) désinstalle tout
 * l'arbre et laisse une page blanche, sans aucun indice pour diagnostiquer.
 * Avec lui, l'erreur reste visible et l'app ne casse jamais silencieusement.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Erreur de rendu interceptée :', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          background: '#0a0a0a',
          color: '#f5f5f5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: '2.5rem' }}>⚠️</span>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          Une erreur inattendue est survenue
        </h1>
        <p style={{ maxWidth: 480, color: '#a3a3a3', fontSize: '0.95rem' }}>
          L'application a rencontré un problème et ne peut pas s'afficher normalement. Recharge la
          page ; si le problème persiste, signale le message ci-dessous.
        </p>
        <pre
          style={{
            maxWidth: 640,
            overflowX: 'auto',
            background: '#171717',
            border: '1px solid #2e2e2e',
            borderRadius: 12,
            padding: '0.9rem 1.1rem',
            fontSize: '0.8rem',
            color: '#f87171',
            textAlign: 'left',
          }}
        >
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '0.5rem',
            padding: '0.6rem 1.4rem',
            borderRadius: 10,
            border: 'none',
            background: '#a78bfa',
            color: '#0a0a0a',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Recharger la page
        </button>
      </div>
    )
  }
}
