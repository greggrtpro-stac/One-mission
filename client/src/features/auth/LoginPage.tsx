import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [googleError, setGoogleError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: () => navigate('/app'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
          <Input
            label="Mot de passe"
            type="password"
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

        {(mutation.error || googleError) && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {googleError ?? (mutation.error instanceof Error ? mutation.error.message : 'Erreur')}
          </p>
        )}

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          Se connecter
        </Button>
      </form>

      <GoogleButton onError={setGoogleError} />
    </AuthLayout>
  )
}
