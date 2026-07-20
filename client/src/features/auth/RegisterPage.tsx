import { PASSWORD_MIN_LENGTH } from '@one-mission/shared'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { register } from '@/api/auth'
import { Button, FieldError, Input, PasswordInput } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import {
  apiErrorToFieldErrors,
  emailFieldError,
  focusFirstError,
  hasFieldErrors,
  passwordFieldError,
  usernameFieldError,
  type AuthField,
  type FieldErrors,
} from './formErrors'
import { GoogleButton } from './GoogleButton'
import { PasswordChecklist } from './PasswordChecklist'
import { PrivacyNotice } from './PrivacyNotice'
import { ResendVerificationForm } from './ResendVerificationForm'
import { TurnstileWidget } from './TurnstileWidget'

/** Ordre visuel des champs : le focus va au premier en erreur. */
const FIELD_ORDER: AuthField[] = ['username', 'email', 'password', 'confirm', 'privacy', 'captcha']

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
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  /** Adresse confirmée par le serveur : bascule vers l'écran « e-mail envoyé ». */
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const fieldRefs = useRef<Partial<Record<AuthField, HTMLElement | null>>>({})

  /** Validation temps réel : l'erreur d'un champ disparaît dès qu'il redevient valide. */
  const clearFieldError = useCallback((field: AuthField) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      register({
        username: username.trim(),
        email: email.trim(),
        password,
        turnstileToken: turnstileToken ?? '',
      }),
    onSuccess: (data) => setRegisteredEmail(data.email),
    onError: (err) => {
      const { fields, general } = apiErrorToFieldErrors(err)
      setFieldErrors(fields)
      setGeneralError(general)
      focusFirstError(fields, FIELD_ORDER, fieldRefs.current)
    },
  })

  // Signalé dès la saisie, sans attendre l'envoi du formulaire.
  const mismatch = confirm.length > 0 && password !== confirm

  // Stable : TurnstileWidget re-rend son défi quand ce callback change.
  const handleTurnstileVerify = useCallback(
    (token: string | null) => {
      setTurnstileToken(token)
      if (token !== null) clearFieldError('captcha')
    },
    [clearFieldError],
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setGeneralError(null)
    const errors: FieldErrors = {
      username: usernameFieldError(username) ?? undefined,
      email: emailFieldError(email) ?? undefined,
      password: passwordFieldError(password) ?? undefined,
      confirm: password !== confirm || !confirm ? 'Les mots de passe ne correspondent pas.' : undefined,
      privacy: privacyAccepted ? undefined : 'Vous devez accepter la politique de confidentialité.',
      captcha: turnstileToken === null ? 'Veuillez compléter le captcha.' : undefined,
    }
    setFieldErrors(errors)
    if (hasFieldErrors(errors)) {
      focusFirstError(errors, FIELD_ORDER, fieldRefs.current)
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
      {/* noValidate : les messages d'erreur stylés remplacent les bulles natives. */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          ref={(el) => {
            fieldRefs.current.username = el
          }}
          label="Pseudo"
          autoComplete="username"
          required
          maxLength={20}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            if (usernameFieldError(e.target.value) === null) clearFieldError('username')
          }}
          placeholder="Ton nom de joueur"
          hint="Visible dans le classement — 3 à 20 caractères."
          error={fieldErrors.username}
        />
        <Input
          ref={(el) => {
            fieldRefs.current.email = el
          }}
          label="Adresse e-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailFieldError(e.target.value) === null) clearFieldError('email')
          }}
          placeholder="toi@exemple.fr"
          error={fieldErrors.email}
        />
        <div className="flex flex-col gap-2">
          <PasswordInput
            ref={(el) => {
              fieldRefs.current.password = el
            }}
            label="Mot de passe"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              const value = e.target.value
              setPassword(value)
              if (passwordFieldError(value) === null) clearFieldError('password')
              if (confirm.length > 0 && confirm === value) clearFieldError('confirm')
            }}
            placeholder={`${PASSWORD_MIN_LENGTH} caractères minimum`}
            error={fieldErrors.password}
          />
          <PasswordChecklist password={password} />
        </div>
        <PasswordInput
          ref={(el) => {
            fieldRefs.current.confirm = el
          }}
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            if (e.target.value === password) clearFieldError('confirm')
          }}
          placeholder="••••••••••••"
          error={fieldErrors.confirm ?? (mismatch ? 'Les mots de passe ne correspondent pas.' : undefined)}
        />

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 shrink-0 cursor-pointer accent-accent"
          />
          Rester connecté
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2.5 text-sm text-muted">
            <input
              ref={(el) => {
                fieldRefs.current.privacy = el
              }}
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => {
                setPrivacyAccepted(e.target.checked)
                if (e.target.checked) clearFieldError('privacy')
              }}
              aria-invalid={!!fieldErrors.privacy}
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
          {fieldErrors.privacy && <FieldError>{fieldErrors.privacy}</FieldError>}
        </div>

        <div
          ref={(el) => {
            fieldRefs.current.captcha = el
          }}
          className="flex flex-col gap-1.5"
        >
          <TurnstileWidget onVerify={handleTurnstileVerify} />
          {fieldErrors.captcha && <FieldError>{fieldErrors.captcha}</FieldError>}
        </div>

        {(generalError || googleError) && (
          <p className="animate-error-in rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {generalError ?? googleError}
          </p>
        )}

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          Créer mon compte
        </Button>

        <PrivacyNotice text="Les données de ce formulaire servent uniquement à créer et gérer ton compte. Tu peux les consulter, les exporter ou les supprimer à tout moment depuis les Paramètres." />
      </form>

      {/* La création de compte par e-mail n'ouvre pas de session (voir
          EmailSentScreen — confirmation obligatoire avant connexion) : ici,
          « Rester connecté » ne s'applique qu'à une inscription via Google,
          qui ouvre une session immédiatement. */}
      <GoogleButton onError={setGoogleError} rememberMe={rememberMe} />
    </AuthLayout>
  )
}
