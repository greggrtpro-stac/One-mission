import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '@/api/auth'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'

export function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [googleError, setGoogleError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => register({ username, email, password }),
    onSuccess: () => navigate('/app'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
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
        <Input
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8 caractères minimum"
        />

        {(mutation.error || googleError) && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {googleError ?? (mutation.error instanceof Error ? mutation.error.message : 'Erreur')}
          </p>
        )}

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          Créer mon compte
        </Button>
      </form>

      <GoogleButton onError={setGoogleError} />
    </AuthLayout>
  )
}
