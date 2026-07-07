import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Consentement cookies / traceurs (RGPD).
 *
 * Catégories :
 * - « essential » : toujours actifs, non désactivables (cookie de session
 *   httpOnly `om_refresh`, mémorisation du thème et de ce consentement).
 *   Exemptés de consentement (art. 82 loi Informatique et Libertés).
 * - « analytics » : mesure d'audience. AUCUN traceur de ce type n'est déposé
 *   aujourd'hui ; la catégorie existe pour que tout ajout futur respecte le
 *   choix déjà exprimé. Refusé par défaut.
 *
 * Règle : aucun script/traceur non essentiel ne doit être chargé sans
 * `useConsentStore.getState().hasConsent('analytics')`.
 */

export type ConsentChoices = {
  analytics: boolean
}

interface ConsentState {
  /** null tant que le visiteur n'a pas fait de choix (bannière visible). */
  choices: ConsentChoices | null
  /** Date ISO du choix — le consentement doit être re-sollicité après 13 mois (recommandation CNIL). */
  decidedAt: string | null
  acceptAll: () => void
  refuseAll: () => void
  save: (choices: ConsentChoices) => void
  /** Réouvre la bannière (page « Gestion des cookies »). */
  reset: () => void
  hasConsent: (category: keyof ConsentChoices) => boolean
}

const CONSENT_MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000 // ~13 mois

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      choices: null,
      decidedAt: null,
      acceptAll: () => set({ choices: { analytics: true }, decidedAt: new Date().toISOString() }),
      refuseAll: () => set({ choices: { analytics: false }, decidedAt: new Date().toISOString() }),
      save: (choices) => set({ choices, decidedAt: new Date().toISOString() }),
      reset: () => set({ choices: null, decidedAt: null }),
      hasConsent: (category) => get().choices?.[category] === true,
    }),
    {
      name: 'om-consent',
      onRehydrateStorage: () => (state) => {
        // Consentement périmé (> 13 mois) : on redemande.
        if (state?.decidedAt && Date.now() - new Date(state.decidedAt).getTime() > CONSENT_MAX_AGE_MS) {
          state.reset()
        }
      },
    },
  ),
)
