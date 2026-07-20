import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '@/api/auth'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { PrivacyNotice } from './PrivacyNotice'
import { TurnstileWidget } from './TurnstileWidget'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email, turnstileToken ?? ''),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (turnstileToken === null) {
      setLocalError('Veuillez compléter le captcha.')
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.fr"
          />
          <TurnstileWidget onVerify={setTurnstileToken} />
          {(localError || mutation.error) && (
            <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {localError ??
                (mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Une erreur est survenue.')}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            loading={mutation.isPending}
            disabled={turnstileToken === null}
            className="w-full"
          >
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
