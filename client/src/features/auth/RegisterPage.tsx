import { isPasswordAcceptable, PASSWORD_MIN_LENGTH } from '@one-mission/shared'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { register } from '@/api/auth'
import { Button, Input, PasswordInput } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { PasswordChecklist } from './PasswordChecklist'
import { PrivacyNotice } from './PrivacyNotice'
import { ResendVerificationForm } from './ResendVerificationForm'
import { TurnstileWidget } from './TurnstileWidget'

/** Écran affiché juste après l'inscription : le compte existe mais reste inactif. */
function EmailSentScreen({ email, onEditEmail }: { email: string; onEditEmail: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-2 px-5 py-7 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <MailCheck size={22} />
        </span>
        <div>
          <p className="font-semibold">Ton compte a été créé avec succès.</p>
          <p className="mt-1.5 text-sm text-muted">
            Un e-mail de confirmation vient de t'être envoyé à <strong className="text-ink">{email}</strong>.
          </p>
          <p className="mt-1.5 text-sm text-muted">
            Vérifie ta boîte de réception avant de te connecter.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Rien reçu ?</p>
        <ResendVerificationForm initialEmail={email} submitLabel="Renvoyer l'e-mail" />
      </div>

      <button
        type="button"
        onClick={onEditEmail}
        className="text-center text-sm text-muted hover:text-accent"
      >
        Modifier mon adresse e-mail
      </button>

      <p className="text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  /** Adresse confirmée par le serveur : bascule vers l'écran « e-mail envoyé ». */
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      register({
        username: username.trim(),
        email: email.trim(),
        password,
        turnstileToken: turnstileToken ?? '',
      }),
    onSuccess: (data) => setRegisteredEmail(data.email),
  })

  // Les deux mots de passe doivent correspondre — signalé dès la saisie.
  const mismatch = confirm.length > 0 && password !== confirm

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (!isPasswordAcceptable(password)) {
      setLocalError('Ton mot de passe ne remplit pas encore tous les critères ci-dessous.')
      return
    }
    if (password !== confirm) {
      setLocalError('Les mots de passe ne correspondent pas.')
      return
    }
    // Doublé avec `required` sur la case : le message reste explicite même si
    // la validation native du navigateur est contournée.
    if (!privacyAccepted) {
      setLocalError('Vous devez accepter la politique de confidentialité.')
      return
    }
    if (turnstileToken === null) {
      setLocalError('Veuillez compléter le captcha.')
      return
    }
    mutation.mutate()
  }

  if (registeredEmail) {
    return (
      <AuthLayout title="Vérifie ta boîte mail" subtitle="Une dernière étape avant de commencer.">
        <EmailSentScreen email={registeredEmail} onEditEmail={() => setRegisteredEmail(null)} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Commence ta mission"
      subtitle={
        <>
          Déjà joueur ?{' '}
          <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
            Connecte-toi
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Pseudo"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Ton nom de joueur"
          hint="Visible dans le classement — 3 à 20 caractères."
        />
        <Input
          label="Adresse e-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.fr"
        />
        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Mot de passe"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`${PASSWORD_MIN_LENGTH} caractères minimum`}
          />
          <PasswordChecklist password={password} />
        </div>
        <PasswordInput
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••••••"
          error={mismatch ? 'Les mots de passe ne correspondent pas.' : undefined}
        />

        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            required
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent"
          />
          <span>
            J'ai lu la{' '}
            <Link
              to="/confidentialite"
              target="_blank"
              className="text-accent underline hover:text-accent-hover"
            >
              politique de confidentialité
            </Link>{' '}
            et j'accepte le traitement de mes données pour la création de mon compte.
          </span>
        </label>

        <TurnstileWidget onVerify={setTurnstileToken} />

        {(localError || mutation.error || googleError) && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {localError ??
              googleError ??
              (mutation.error instanceof Error
                ? mutation.error.message
                : 'Une erreur est survenue. Veuillez réessayer plus tard.')}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          loading={mutation.isPending}
          disabled={turnstileToken === null}
          className="w-full"
        >
          Créer mon compte
        </Button>

        <PrivacyNotice text="Les données de ce formulaire servent uniquement à créer et gérer ton compte. Tu peux les consulter, les exporter ou les supprimer à tout moment depuis les Paramètres." />
      </form>

      <GoogleButton onError={setGoogleError} />
    </AuthLayout>
  )
}
