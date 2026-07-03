import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '@/api/auth'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const mutation = useMutation({ mutationFn: () => resetPassword(token, password) })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) {
      setLocalError('Les deux mots de passe ne correspondent pas')
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 caractères minimum"
          />
          <Input
            label="Confirme le mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
          {(localError || mutation.error) && (
            <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {localError ??
                (mutation.error instanceof Error ? mutation.error.message : 'Erreur')}
            </p>
          )}
          <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
            Mettre à jour
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
