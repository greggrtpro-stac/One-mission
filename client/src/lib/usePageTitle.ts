import { useEffect } from 'react'

const DEFAULT_TITLE = 'One Mission — Ta vie, une quête à la fois'

/** Titre d'onglet propre à la page (SEO + repérage des onglets), restauré au démontage. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — One Mission` : DEFAULT_TITLE
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [title])
}
