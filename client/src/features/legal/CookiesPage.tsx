import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Toggle } from '@/components/ui'
import { useConsentStore } from '@/stores/consent'
import { LegalLayout, LegalSection } from './LegalLayout'

/** Inventaire exhaustif des traceurs réellement utilisés par l'application. */
const TRACKERS = [
  {
    name: 'om_refresh',
    type: 'Cookie (httpOnly)',
    purpose: 'Maintenir ta session connectée de façon sécurisée.',
    duration: '30 jours',
    category: 'Essentiel',
  },
  {
    name: 'om-theme',
    type: 'localStorage',
    purpose: 'Mémoriser ton choix de thème (clair/sombre).',
    duration: "Jusqu'à suppression par toi",
    category: 'Essentiel',
  },
  {
    name: 'om-consent',
    type: 'localStorage',
    purpose: 'Mémoriser tes choix de consentement cookies.',
    duration: '13 mois maximum',
    category: 'Essentiel',
  },
]

export function CookiesPage() {
  const { choices, decidedAt, save, refuseAll, acceptAll } = useConsentStore()
  const [saved, setSaved] = useState(false)

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <LegalLayout title="Gestion des cookies">
      <LegalSection title="Modifier mes choix">
        <p>
          Tu peux modifier ton consentement à tout moment : le changement s'applique
          immédiatement.
          {decidedAt && (
            <span className="text-faint">
              {' '}
              Dernier choix enregistré le{' '}
              {new Date(decidedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              .
            </span>
          )}
        </p>
        <Card className="p-5">
          <div className="flex flex-col gap-3">
            <Toggle
              label="Cookies essentiels"
              description="Connexion sécurisée, thème, mémorisation de ce choix. Nécessaires au fonctionnement, toujours actifs."
              checked
              disabled
              onChange={() => {}}
            />
            <Toggle
              label="Mesure d'audience"
              description="Aucun traceur de ce type n'est utilisé actuellement. Ton choix sera respecté si nous en ajoutons un jour."
              checked={choices?.analytics ?? false}
              onChange={(v) => {
                save({ analytics: v })
                flash()
              }}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {saved && <p className="text-sm font-medium text-success">Choix enregistré ✓</p>}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                refuseAll()
                flash()
              }}
            >
              Tout refuser
            </Button>
            <Button
              size="sm"
              onClick={() => {
                acceptAll()
                flash()
              }}
            >
              Tout accepter
            </Button>
          </div>
        </Card>
        {choices === null && (
          <p className="text-faint">
            Aucun choix enregistré pour l'instant — la bannière de consentement s'affiche sur le
            site.
          </p>
        )}
      </LegalSection>

      <LegalSection title="Traceurs utilisés">
        <p>
          {`${TRACKERS.length} traceurs sont utilisés, tous essentiels au fonctionnement du site
          (exemptés de consentement). Aucun traceur publicitaire ou de mesure d'audience n'est
          déposé.`}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-faint uppercase">
                <th className="py-2 pr-4 font-medium">Nom</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Finalité</th>
                <th className="py-2 pr-4 font-medium">Durée</th>
                <th className="py-2 font-medium">Catégorie</th>
              </tr>
            </thead>
            <tbody>
              {TRACKERS.map((t) => (
                <tr key={t.name} className="border-b border-line/50">
                  <td className="py-2.5 pr-4 font-mono text-xs">{t.name}</td>
                  <td className="py-2.5 pr-4 text-muted">{t.type}</td>
                  <td className="py-2.5 pr-4 text-muted">{t.purpose}</td>
                  <td className="py-2.5 pr-4 text-muted">{t.duration}</td>
                  <td className="py-2.5">
                    <Badge variant="success">{t.category}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="Services tiers">
        <p>
          <span className="font-medium text-ink">Connexion Google</span> — le script de Google
          n'est chargé que si tu cliques sur « Continuer avec Google » : c'est alors Google qui
          peut déposer ses propres cookies, dans le cadre du service d'authentification que tu as
          expressément demandé.
        </p>
      </LegalSection>

      <LegalSection title="En savoir plus">
        <p>
          Le traitement de tes données est décrit dans la{' '}
          <Link to="/confidentialite" className="text-accent hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
