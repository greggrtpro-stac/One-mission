import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { ApiRequestError } from '@/api/http'
import { Button, Input, PasswordInput } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { PrivacyNotice } from './PrivacyNotice'
import { ResendVerificationForm } from './ResendVerificationForm'
import { TurnstileWidget } from './TurnstileWidget'

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiRequestError)) return undefined
  return (error.details as { code?: string } | undefined)?.code
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => login(email, password, turnstileToken ?? ''),
    onSuccess: () => navigate('/app'),
  })

  const needsVerification = errorCode(mutation.error) === 'EMAIL_NOT_VERIFIED'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (turnstileToken === null) {
      setLocalError('Vérification anti-robot en cours, réessaie dans un instant.')
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
        <div>
          <PasswordInput
            label="Mot de passe"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="mt-1.5 text-right">
            <Link to="/forgot-password" className="text-xs text-muted hover:text-accent">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <TurnstileWidget onVerify={setTurnstileToken} />

        {(localError || (mutation.error && !needsVerification) || googleError) && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {localError ??
              googleError ??
              (mutation.error instanceof Error ? mutation.error.message : 'Erreur')}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          loading={mutation.isPending}
          disabled={turnstileToken === null}
          className="w-full"
        >
          Se connecter
        </Button>

        <PrivacyNotice text="Tes identifiants servent uniquement à t'authentifier et à sécuriser ton compte." />
      </form>

      {/* Compte pas encore vérifié : renvoi de l'e-mail directement depuis l'écran de connexion. */}
      {needsVerification && (
        <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4">
          <p className="text-sm font-medium">Ton adresse e-mail n'est pas encore vérifiée.</p>
          <p className="mt-1 text-xs text-muted">
            Vérifie ta boîte de réception, ou demande un nouveau lien ci-dessous.
          </p>
          <div className="mt-3">
            <ResendVerificationForm initialEmail={email} submitLabel="Renvoyer l'e-mail" />
          </div>
        </div>
      )}

      <GoogleButton onError={setGoogleError} />
    </AuthLayout>
  )
}
