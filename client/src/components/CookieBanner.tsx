import { AnimatePresence, motion } from 'framer-motion'
import { Cookie } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Toggle } from '@/components/ui'
import { useConsentStore, type ConsentChoices } from '@/stores/consent'

/**
 * Bannière de consentement cookies (RGPD) : affichée tant qu'aucun choix
 * n'a été enregistré. Accepter tout / Refuser tout ont la même visibilité
 * (exigence CNIL) ; « Personnaliser » ouvre le détail des catégories.
 */
export function CookieBanner() {
  const { choices, acceptAll, refuseAll, save } = useConsentStore()
  const [customizing, setCustomizing] = useState(false)
  const [draft, setDraft] = useState<ConsentChoices>({ analytics: false })

  return (
    <AnimatePresence>
      {choices === null && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="dialog"
          aria-modal="false"
          aria-label="Gestion des cookies"
          className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-accent">
                <Cookie size={20} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">Cookies &amp; confidentialité</p>
                <p className="mt-1 text-sm text-muted">
                  One Mission utilise uniquement des cookies essentiels au fonctionnement du site
                  (connexion sécurisée, mémorisation de tes préférences). Aucun traceur
                  publicitaire ni de mesure d'audience n'est déposé sans ton accord.{' '}
                  <Link to="/cookies" className="text-accent hover:underline">
                    En savoir plus
                  </Link>
                </p>
              </div>
            </div>

            {customizing && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface-2/50 p-4">
                <Toggle
                  label="Cookies essentiels"
                  description="Connexion sécurisée, thème, mémorisation de ce choix. Toujours actifs."
                  checked
                  disabled
                  onChange={() => {}}
                />
                <Toggle
                  label="Mesure d'audience"
                  description="Aucun traceur de ce type n'est utilisé actuellement. Ton choix sera respecté si nous en ajoutons."
                  checked={draft.analytics}
                  onChange={(v) => setDraft({ analytics: v })}
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {customizing ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setCustomizing(false)}>
                    Retour
                  </Button>
                  <Button size="sm" onClick={() => save(draft)}>
                    Enregistrer mes choix
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setCustomizing(true)}>
                    Personnaliser
                  </Button>
                  <Button variant="secondary" size="sm" onClick={refuseAll}>
                    Tout refuser
                  </Button>
                  <Button size="sm" onClick={acceptAll}>
                    Tout accepter
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
