import type { CommunicationLogEntry, CommunicationPrefs } from '@one-mission/shared'
import { useMutation } from '@tanstack/react-query'
import { History, Mail, MailX, Settings2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { unsubscribeMarketing, updateProfile, type ProfilePayload } from '@/api/users'
import { Button, Card, ConfirmDialog, Toggle } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'

function ErrorNote({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) return null
  return (
    <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {error instanceof Error ? error.message : fallback}
    </p>
  )
}

// ── Newsletter ───────────────────────────────────────────────

function NewsletterCard({
  save,
  newsletterOptIn,
}: {
  save: ReturnType<typeof useCommunicationSave>
  newsletterOptIn: boolean
}) {
  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <Mail size={16} className="text-accent" /> Newsletter One Mission
      </h3>
      <p className="mt-1 text-sm text-muted">
        Recevez les nouveautés, conseils de productivité et annonces importantes concernant One
        Mission.
      </p>
      <div className="mt-4">
        <Toggle
          label="Je souhaite recevoir la newsletter One Mission"
          checked={newsletterOptIn}
          onChange={(v) => save.mutate({ newsletterOptIn: v })}
        />
      </div>
    </Card>
  )
}

// ── Préférences de communication ─────────────────────────────

const PREFERENCE_ROWS: {
  key: keyof CommunicationPrefs
  label: string
  description?: string
  locked?: boolean
}[] = [
  { key: 'productUpdates', label: 'Recevoir les nouveautés de One Mission' },
  { key: 'productivityTips', label: 'Recevoir les conseils de productivité' },
  { key: 'featureAnnouncements', label: 'Recevoir les annonces des nouvelles fonctionnalités' },
  { key: 'promotionalOffers', label: 'Recevoir les offres promotionnelles' },
  {
    key: 'accountSecurity',
    label: 'Recevoir les emails importants concernant mon compte',
    description: 'Toujours activée : ces e-mails concernent la sécurité de ton compte.',
    locked: true,
  },
]

function CommunicationPreferencesCard({
  save,
  prefs,
}: {
  save: ReturnType<typeof useCommunicationSave>
  prefs: CommunicationPrefs
}) {
  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <Settings2 size={16} className="text-accent" /> Préférences de communication
      </h3>
      <p className="mt-1 text-sm text-muted">
        Choisis précisément les e-mails que tu souhaites recevoir de notre part.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {PREFERENCE_ROWS.map((row) => (
          <Toggle
            key={row.key}
            label={row.label}
            description={row.description}
            checked={row.locked ? true : prefs[row.key]}
            disabled={row.locked}
            onChange={(v) => save.mutate({ communicationPrefs: { ...prefs, [row.key]: v } })}
          />
        ))}
      </div>
    </Card>
  )
}

// ── Emails transactionnels (info, non désactivable) ──────────

function TransactionalEmailsCard() {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h3 className="font-semibold">Emails de sécurité</h3>
          <p className="mt-1 text-sm text-muted">
            Les emails concernant la sécurité de votre compte (connexion, changement de mot de
            passe, vérification d'email, authentification, abonnements...) sont toujours envoyés
            afin de protéger votre compte.
          </p>
        </div>
      </div>
    </Card>
  )
}

// ── Historique (structure préparée, vide pour l'instant) ─────

function HistoryCard() {
  // Rien n'alimente encore cette liste (voir server/src/lib/marketingProvider.ts) :
  // la structure est prête à recevoir date / type / statut le jour venu.
  const history: CommunicationLogEntry[] = []

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <History size={16} className="text-accent" /> Historique des communications
      </h3>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Aucun email récent.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {history.map((entry, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted">{entry.date}</span>
              <span>{entry.type}</span>
              <span className="text-muted">{entry.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ── Désinscription globale ────────────────────────────────────

function UnsubscribeCard() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const unsubscribe = useMutation({
    mutationFn: unsubscribeMarketing,
    onSuccess: () => setConfirmOpen(false),
  })

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <MailX size={16} className="text-danger" /> Désinscription
          </h3>
          <p className="mt-1 text-sm text-muted">
            Coupe la newsletter et toutes les préférences marketing en un clic. Les e-mails de
            sécurité restent toujours envoyés.
          </p>
        </div>
        <Button variant="danger-soft" onClick={() => setConfirmOpen(true)}>
          <MailX size={14} /> Se désinscrire de toutes les communications marketing
        </Button>
      </div>
      <ErrorNote error={unsubscribe.error} fallback="Impossible de traiter la désinscription" />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => unsubscribe.mutate()}
        icon={MailX}
        tone="accent"
        title="Se désinscrire ?"
        description={
          <>
            <p>Vous ne recevrez plus les communications marketing.</p>
            <p>Les emails liés à la sécurité de votre compte continueront d'être envoyés.</p>
          </>
        }
        confirmLabel="Confirmer"
        loading={unsubscribe.isPending}
      />
    </Card>
  )
}

// ── Composition ──────────────────────────────────────────────

/** Mutation partagée par les cartes de cette section : même style que PreferencesCards. */
function useCommunicationSave() {
  return useMutation({ mutationFn: (payload: ProfilePayload) => updateProfile(payload) })
}

export function CommunicationCards() {
  const user = useAuthStore((s) => s.user)!
  const save = useCommunicationSave()

  return (
    <div className="flex flex-col gap-4">
      <NewsletterCard save={save} newsletterOptIn={user.newsletterOptIn} />
      <CommunicationPreferencesCard save={save} prefs={user.communicationPrefs} />
      <TransactionalEmailsCard />
      <HistoryCard />
      <UnsubscribeCard />
      <ErrorNote error={save.error} fallback="Impossible d'enregistrer la préférence" />
    </div>
  )
}
