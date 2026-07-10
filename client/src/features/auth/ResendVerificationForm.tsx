import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { resendVerification } from '@/api/auth'
import { Button, Input } from '@/components/ui'
import { TurnstileWidget } from './TurnstileWidget'

interface ResendVerificationFormProps {
  initialEmail?: string
  /** Libellé du bouton d'envoi — adapté au contexte d'affichage. */
  submitLabel?: string
}

/**
 * Formulaire de renvoi de l'e-mail de confirmation, réutilisé sur l'écran
 * post-inscription, la page de connexion (compte pas encore vérifié) et les
 * états « lien expiré / invalide » de la page de vérification.
 * Ne révèle jamais si le compte existe : message générique dans tous les cas.
 */
export function ResendVerificationForm({
  initialEmail = '',
  submitLabel = "Renvoyer l'e-mail de confirmation",
}: ResendVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => resendVerification(email.trim(), turnstileToken ?? ''),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (turnstileToken === null) {
      setLocalError('Vérification anti-robot en cours, réessaie dans un instant.')
      return
    }
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <div className="rounded-xl bg-success-soft px-4 py-3.5 text-sm text-success">
        {mutation.data.message}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
          {localError ?? (mutation.error instanceof Error ? mutation.error.message : 'Erreur')}
        </p>
      )}
      <Button
        type="submit"
        loading={mutation.isPending}
        disabled={turnstileToken === null}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  )
}
