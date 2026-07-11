import { Link } from 'react-router-dom'
import { LEGAL } from '@/config/legal'
import { LegalField, LegalLayout, LegalSection } from './LegalLayout'

/**
 * Mentions légales (art. 6-III de la LCEN).
 * Les valeurs proviennent de src/config/legal.ts — les champs affichés en
 * couleur d’avertissement sont à compléter par l’éditeur du site, rien n’a été inventé.
 */
export function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales">
      <LegalSection title="Éditeur du site">
        <LegalField label="Site" value={LEGAL.siteName} />
        <LegalField label="URL" value={LEGAL.siteUrl} />
        <LegalField label="Éditeur" value={LEGAL.editor.name} />
        <LegalField label="Forme juridique" value={LEGAL.editor.legalForm} />
        <LegalField label="Capital social" value={LEGAL.editor.shareCapital} />
        <LegalField label="Siège social" value={LEGAL.editor.address} />
        <LegalField label="SIRET" value={LEGAL.editor.siret} />
        <LegalField label="RCS" value={LEGAL.editor.rcs} />
        <LegalField label="TVA intracommunautaire" value={LEGAL.editor.vatNumber} />
        <LegalField label="E-mail" value={LEGAL.editor.email} />
        <LegalField label="Téléphone" value={LEGAL.editor.phone} />
      </LegalSection>

      <LegalSection title="Directeur de la publication">
        <LegalField label="Directeur de la publication" value={LEGAL.publicationDirector} />
      </LegalSection>

      <LegalSection title="Hébergement">
        <LegalField label="Hébergeur" value={LEGAL.host.name} />
        <LegalField label="Adresse" value={LEGAL.host.address} />
        <LegalField label="Contact" value={LEGAL.host.contact} />
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L'ensemble des éléments du site {LEGAL.siteName} (textes, interface, logo, code) est
          protégé par le droit de la propriété intellectuelle. Toute reproduction ou
          représentation, totale ou partielle, sans autorisation écrite préalable de l'éditeur est
          interdite.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Le traitement des données personnelles est décrit dans la{' '}
          <Link to="/confidentialite" className="text-accent hover:underline">
            politique de confidentialité
          </Link>
          . L'utilisation des cookies est détaillée sur la page{' '}
          <Link to="/cookies" className="text-accent hover:underline">
            gestion des cookies
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
