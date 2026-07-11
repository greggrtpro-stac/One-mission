import { Link } from 'react-router-dom'
import { LEGAL } from '@/config/legal'
import { LegalField, LegalLayout, LegalSection, LegalValue } from './LegalLayout'

/**
 * Politique de confidentialité (RGPD).
 * Rédigée d'après le fonctionnement réel de l'application : chaque traitement
 * décrit ici correspond à une fonctionnalité existante. À relire et compléter
 * par l’éditeur (champs en couleur d’avertissement), notamment l’identité du responsable de
 * traitement et l'hébergeur.
 */
export function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <LegalSection title="Responsable du traitement">
        <LegalField label="Responsable" value={LEGAL.editor.name} />
        <LegalField label="Adresse" value={LEGAL.editor.address} />
        <LegalField label="Contact pour vos données" value={LEGAL.privacy.contactEmail} />
        {!LEGAL.privacy.hasDpo && (
          <p className="text-faint">Aucun délégué à la protection des données n'est désigné à ce jour.</p>
        )}
      </LegalSection>

      <LegalSection title="Données collectées et finalités">
        <p>
          <span className="font-medium text-ink">Données de compte</span> — e-mail, pseudo, mot de
          passe (stocké uniquement sous forme hachée, jamais en clair), et si tu choisis de les
          renseigner : prénom, nom, téléphone, photo de profil. Si tu utilises la connexion
          Google : ton identifiant Google. <em>Finalité :</em> créer et sécuriser ton compte.{' '}
          <em>Base légale :</em> exécution du contrat.
        </p>
        <p>
          <span className="font-medium text-ink">Données de progression</span> — quêtes,
          événements de planning, quêtes hebdomadaires, points d'expérience, niveau, séries
          d'activité, sessions de concentration (DeepWork), formule d'abonnement.{' '}
          <em>Finalité :</em> fournir le service de suivi et de gamification. <em>Base légale :</em>{' '}
          exécution du contrat.
        </p>
        <p>
          <span className="font-medium text-ink">Contenus volontaires sensibles</span> — les
          entrées de ton journal, tes suivis d'addictions (et rechutes) et tes échanges avec le
          coach IA peuvent révéler des informations relatives à ta santé. Ces fonctionnalités sont
          strictement facultatives : les données ne sont traitées que si tu choisis de les saisir.{' '}
          <em>Base légale :</em> consentement explicite, retirable à tout moment en supprimant les
          contenus ou le compte.
        </p>
        <p>
          <span className="font-medium text-ink">Données techniques de sécurité</span> — pour
          chaque session de connexion : navigateur, système d'exploitation, adresse IP, dates de
          connexion et d'activité. Visibles et révocables dans Paramètres → Appareils connectés.{' '}
          <em>Finalité :</em> sécuriser ton compte. <em>Base légale :</em> intérêt légitime.
        </p>
        <p>
          <span className="font-medium text-ink">Classement public</span> — si l'option « Afficher
          mon profil dans le classement public » est activée (modifiable à tout moment dans les
          Paramètres), ton pseudo, ton niveau, ton XP et ta photo sont visibles des autres joueurs.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires et sous-traitants">
        <p>Tes données ne sont ni vendues ni utilisées à des fins publicitaires. Elles ne sont transmises qu'aux prestataires techniques strictement nécessaires :</p>
        <ul className="list-disc pl-5">
          <li>
            <span className="font-medium text-ink">Hébergement :</span>{' '}
            <LegalValue value={LEGAL.host.name} />
          </li>
          <li>
            <span className="font-medium text-ink">Anthropic (coach IA et analyse du journal) :</span>{' '}
            lorsque tu utilises le coach IA ou l'analyse de journal, le contenu concerné est
            transmis à l'API Claude d'Anthropic pour générer la réponse. Aucune autre donnée du
            compte n'est transmise.
          </li>
          <li>
            <span className="font-medium text-ink">Google :</span> uniquement si tu choisis la
            connexion « Continuer avec Google », Google traite ta demande d'authentification selon
            sa propre politique de confidentialité.
          </li>
        </ul>
        <p className="text-faint">
          Aucun paiement en ligne n'est traité à ce jour ; cette politique sera mise à jour si un
          prestataire de paiement est ajouté.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul className="list-disc pl-5">
          <li>Données du compte et contenus : conservés tant que le compte existe, supprimés définitivement (sans archive) à la suppression du compte.</li>
          <li>Sessions de connexion : 30 jours maximum, ou jusqu'à déconnexion/révocation.</li>
          <li>Jetons de réinitialisation de mot de passe : 1 heure.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Tes droits">
        <p>
          Conformément au RGPD, tu disposes des droits d'accès, de rectification, d'effacement, de
          portabilité, de limitation et d'opposition. La plupart s'exercent directement dans
          l'application :
        </p>
        <ul className="list-disc pl-5">
          <li>
            <span className="font-medium text-ink">Consulter et rectifier</span> : Paramètres →
            Compte.
          </li>
          <li>
            <span className="font-medium text-ink">Télécharger tes données</span> (portabilité) :
            Paramètres → Confidentialité → « Télécharger mes données ».
          </li>
          <li>
            <span className="font-medium text-ink">Supprimer ton compte</span> et toutes ses
            données : Paramètres → Sécurité → Zone de danger.
          </li>
        </ul>
        <p>
          Pour toute autre demande, écris à{' '}
          <LegalValue value={LEGAL.privacy.contactEmail} /> — réponse sous un mois. Tu
          peux aussi introduire une réclamation auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            cnil.fr
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Mots de passe hachés avec un algorithme robuste (Argon2), échanges chiffrés (HTTPS en
          production), jetons de session à durée limitée et révocables, accès aux données restreint
          au strict nécessaire.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Voir la page{' '}
          <Link to="/cookies" className="text-accent hover:underline">
            gestion des cookies
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
