import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { ApiRequestError } from '@/api/http'
import { Button, FieldError, Input, PasswordInput } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import {
  apiErrorToFieldErrors,
  emailFieldError,
  focusFirstError,
  hasFieldErrors,
  type AuthField,
  type FieldErrors,
} from './formErrors'
import { GoogleButton } from './GoogleButton'
import { PrivacyNotice } from './PrivacyNotice'
import { ResendVerificationForm } from './ResendVerificationForm'
import { TurnstileWidget } from './TurnstileWidget'

const FIELD_ORDER: AuthField[] = ['email', 'password', 'captcha']

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiRequestError)) return undefined
  return (error.details as { code?: string } | undefined)?.code
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)

  const fieldRefs = useRef<Partial<Record<AuthField, HTMLElement | null>>>({})

  /** Validation temps réel : l'erreur d'un champ disparaît dès qu'il redevient valide. */
  const clearFieldError = useCallback((field: AuthField) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }, [])

  const mutation = useMutation({
    mutationFn: () => login(email, password, turnstileToken ?? '', rememberMe),
    onSuccess: () => navigate('/app'),
    onError: (err) => {
      // Compte non vérifié : l'encart dédié (renvoi d'e-mail) suffit, pas
      // d'erreur générale en doublon.
      if (errorCode(err) === 'EMAIL_NOT_VERIFIED') return
      const { fields, general } = apiErrorToFieldErrors(err)
      setFieldErrors(fields)
      setGeneralError(general)
      focusFirstError(fields, FIELD_ORDER, fieldRefs.current)
    },
  })

  const needsVerification = errorCode(mutation.error) === 'EMAIL_NOT_VERIFIED'

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
      email: emailFieldError(email) ?? undefined,
      password: password ? undefined : 'Le mot de passe est requis.',
      captcha: turnstileToken === null ? 'Veuillez compléter le captcha.' : undefined,
    }
    setFieldErrors(errors)
    if (hasFieldErrors(errors)) {
      focusFirstError(errors, FIELD_ORDER, fieldRefs.current)
      return
    }
    mutation.mutate()
  }

  return (
    <AuthLayout
      title="Bon retour, joueur"
      subtitle={
        <>
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
            Crée le tien
          </Link>
        </>
      }
    >
      {/* noValidate : les messages d'erreur stylés remplacent les bulles natives. */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
        <div>
          <PasswordInput
            ref={(el) => {
              fieldRefs.current.password = el
            }}
            label="Mot de passe"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (e.target.value) clearFieldError('password')
            }}
            placeholder="••••••••"
            error={fieldErrors.password}
          />
          <div className="mt-2.5 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 shrink-0 cursor-pointer accent-accent"
              />
              Rester connecté
            </label>
            <Link to="/forgot-password" className="text-xs text-muted hover:text-accent">
              Mot de passe oublié ?
            </Link>
          </div>
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
          Se connecter
        </Button>

        <PrivacyNotice text="Tes identifiants servent uniquement à t'authentifier et à sécuriser ton compte." />
      </form>

      {/* Compte pas encore vérifié : renvoi de l'e-mail directement depuis l'écran de connexion. */}
      {needsVerification && (
        <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4">
          <p className="text-sm font-medium">
            Vous devez confirmer votre adresse e-mail avant de vous connecter.
          </p>
          <p className="mt-1 text-xs text-muted">
            Vérifie ta boîte de réception, ou demande un nouveau lien ci-dessous.
          </p>
          <div className="mt-3">
            <ResendVerificationForm initialEmail={email} submitLabel="Renvoyer l'e-mail" />
          </div>
        </div>
      )}

      <GoogleButton onError={setGoogleError} rememberMe={rememberMe} />
    </AuthLayout>
  )
}
