import type { CommunicationPrefs } from '@one-mission/shared'
import { log } from './log.js'

/**
 * Interface d'envoi marketing — ARCHITECTURE PRÉPARÉE, AUCUN FOURNISSEUR
 * CONNECTÉ. Le jour où Brevo, Resend ou MailerLite est branché, il suffit
 * d'écrire une classe qui implémente cette interface (un appel HTTP vers son
 * API) et de remplacer {@link marketingProvider} par cette implémentation —
 * rien d'autre dans l'application n'a besoin de changer.
 */
export interface MarketingProvider {
  /** Crée ou met à jour le contact chez le fournisseur avec ses préférences actuelles. */
  syncContact(email: string, prefs: CommunicationPrefs, newsletterOptIn: boolean): Promise<void>
  /** Désinscrit le contact de toutes les listes marketing (pas des e-mails de sécurité). */
  unsubscribeAll(email: string): Promise<void>
}

/**
 * Implémentation par défaut tant qu'aucun fournisseur n'est configuré :
 * journalise l'intention en développement, ne fait aucun appel réseau.
 * Même philosophie que mailer.ts sans SMTP configuré.
 */
class NoopMarketingProvider implements MarketingProvider {
  async syncContact(email: string, prefs: CommunicationPrefs, newsletterOptIn: boolean): Promise<void> {
    log('debug', 'marketing.sync_contact.noop', { newsletterOptIn, prefs })
    void email // jamais journalisé — donnée personnelle
  }

  async unsubscribeAll(email: string): Promise<void> {
    log('debug', 'marketing.unsubscribe_all.noop', {})
    void email
  }
}

export const marketingProvider: MarketingProvider = new NoopMarketingProvider()
