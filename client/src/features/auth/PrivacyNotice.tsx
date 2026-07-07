import { Link } from 'react-router-dom'

/**
 * Information sur le traitement des données (art. 13 RGPD), affichée sous
 * chaque formulaire qui collecte des données personnelles.
 */
export function PrivacyNotice({ text }: { text: string }) {
  return (
    <p className="text-xs leading-relaxed text-faint">
      {text} En savoir plus :{' '}
      <Link to="/confidentialite" className="text-muted underline hover:text-accent">
        politique de confidentialité
      </Link>
      .
    </p>
  )
}
