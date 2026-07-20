import { PASSWORD_MIN_LENGTH } from '@one-mission/shared'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '@/api/auth'
import { Button, PasswordInput } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import {
  apiErrorToFieldErrors,
  focusFirstError,
  hasFieldErrors,
  passwordFieldError,
  type AuthField,
  type FieldErrors,
} from './formErrors'
import { PasswordChecklist } from './PasswordChecklist'

const FIELD_ORDER: AuthField[] = ['password', 'confirm']

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const fieldRefs = useRef<Partial<Record<AuthField, HTMLElement | null>>>({})

  /** Validation temps réel : l'erreur d'un champ disparaît dès qu'il redevient valide. */
  const clearFieldError = useCallback((field: AuthField) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }, [])

  const mutation = useMutation({
    mutationFn: () => resetPassword(token, password),
    onError: (err) => {
      // Lien invalide ou expiré : l'erreur concerne le jeton, pas un champ.
      const { fields, general } = apiErrorToFieldErrors(err)
      setFieldErrors(fields)
      setGeneralError(general)
      focusFirstError(fields, FIELD_ORDER, fieldRefs.current)
    },
  })

  // Signalé dès la saisie, sans attendre l'envoi du formulaire.
  const mismatch = confirm.length > 0 && password !== confirm

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setGeneralError(null)
    const errors: FieldErrors = {
      password: passwordFieldError(password) ?? undefined,
      confirm: password !== confirm || !confirm ? 'Les mots de passe ne correspondent pas.' : undefined,
    }
    setFieldErrors(errors)
    if (hasFieldErrors(errors)) {
      focusFirstError(errors, FIELD_ORDER, fieldRefs.current)
      return
    }
    mutation.mutate()
  }

  if (!token) {
    return (
      <AuthLayout title="Lien invalide" subtitle="Ce lien de réinitialisation est incomplet.">
        <Link to="/forgot-password">
          <Button size="lg" className="w-full">
            Refaire une demande
          </Button>
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisis ton nouveau mot de passe.">
      {mutation.isSuccess ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-success-soft px-4 py-3.5 text-sm text-success">
            {mutation.data.message}
          </div>
          <Link to="/login">
            <Button size="lg" className="w-full">
              Se connecter
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <PasswordInput
              ref={(el) => {
                fieldRefs.current.password = el
              }}
              label="Nouveau mot de passe"
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
            label="Confirme le mot de passe"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              if (e.target.value === password) clearFieldError('confirm')
            }}
            placeholder="••••••••••••"
            error={
              fieldErrors.confirm ?? (mismatch ? 'Les mots de passe ne correspondent pas.' : undefined)
            }
          />
          {generalError && (
            <div className="animate-error-in flex flex-col gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              <span>{generalError}</span>
              <Link to="/forgot-password" className="font-medium underline">
                Refaire une demande de réinitialisation
              </Link>
            </div>
          )}
          <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
            Mettre à jour
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
