import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '@/api/auth'
import { Button, FieldError, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import {
  apiErrorToFieldErrors,
  emailFieldError,
  focusFirstError,
  hasFieldErrors,
  type AuthField,
  type FieldErrors,
} from './formErrors'
import { PrivacyNotice } from './PrivacyNotice'
import { TurnstileWidget } from './TurnstileWidget'

const FIELD_ORDER: AuthField[] = ['email', 'captcha']

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const fieldRefs = useRef<Partial<Record<AuthField, HTMLElement | null>>>({})

  /** Validation temps réel : l'erreur d'un champ disparaît dès qu'il redevient valide. */
  const clearFieldError = useCallback((field: AuthField) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }, [])

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email, turnstileToken ?? ''),
    onError: (err) => {
      const { fields, general } = apiErrorToFieldErrors(err)
      setFieldErrors(fields)
      setGeneralError(general)
      focusFirstError(fields, FIELD_ORDER, fieldRefs.current)
    },
  })

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
      title="Mot de passe oublié"
      subtitle="Indique ton adresse e-mail : nous t'enverrons un lien de réinitialisation."
    >
      {mutation.isSuccess ? (
        <div className="rounded-xl bg-success-soft px-4 py-3.5 text-sm text-success">
          {mutation.data.message}
        </div>
      ) : (
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
          <div
            ref={(el) => {
              fieldRefs.current.captcha = el
            }}
            className="flex flex-col gap-1.5"
          >
            <TurnstileWidget onVerify={handleTurnstileVerify} />
            {fieldErrors.captcha && <FieldError>{fieldErrors.captcha}</FieldError>}
          </div>
          {generalError && (
            <p className="animate-error-in rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {generalError}
            </p>
          )}
          <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
            Envoyer le lien
          </Button>

          <PrivacyNotice text="Ton adresse e-mail est utilisée uniquement pour t'envoyer le lien de réinitialisation." />
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/login" className="text-accent hover:text-accent-hover">
          ← Retour à la connexion
        </Link>
      </p>
    </AuthLayout>
  )
}
