import { useMutation } from '@tanstack/react-query'
import { KeyRound, Moon, Sun } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { changePassword, updateProfile } from '@/api/users'
import { Button, Card, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemeName } from '@/stores/theme'

function ThemeChoice({
  value,
  label,
  icon: Icon,
  active,
  onSelect,
}: {
  value: ThemeName
  label: string
  icon: typeof Sun
  active: boolean
  onSelect: (t: ThemeName) => void
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line text-muted hover:border-line-strong hover:text-ink',
      )}
    >
      <Icon size={16} /> {label}
    </button>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { theme, setTheme } = useThemeStore()

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaved, setPwdSaved] = useState(false)

  // Le thème s'applique immédiatement et se sauvegarde sur le compte.
  const saveTheme = useMutation({
    mutationFn: (t: ThemeName) => updateProfile({ theme: t }),
  })

  function handleTheme(t: ThemeName) {
    setTheme(t)
    saveTheme.mutate(t)
  }

  const savePassword = useMutation({
    mutationFn: () =>
      changePassword({
        currentPassword: user?.hasPassword ? pwd.current : undefined,
        newPassword: pwd.next,
      }),
    onSuccess: () => {
      setPwd({ current: '', next: '', confirm: '' })
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 2500)
    },
  })

  if (!user) return null

  function handlePassword(e: FormEvent) {
    e.preventDefault()
    setPwdError(null)
    if (pwd.next.length < 8) {
      setPwdError('Le nouveau mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError('Les deux mots de passe ne correspondent pas.')
      return
    }
    savePassword.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
      <p className="mt-1 text-sm text-muted">Apparence et sécurité de ton compte.</p>

      {/* Apparence */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Apparence</h2>
        <p className="mt-1 text-sm text-muted">
          Le thème choisi suit ton compte sur tous tes appareils.
        </p>
        <div className="mt-4 flex gap-3">
          <ThemeChoice
            value="dark"
            label="Sombre"
            icon={Moon}
            active={theme === 'dark'}
            onSelect={handleTheme}
          />
          <ThemeChoice
            value="light"
            label="Clair"
            icon={Sun}
            active={theme === 'light'}
            onSelect={handleTheme}
          />
        </div>
      </Card>

      {/* Mot de passe */}
      <Card className="mt-4 p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound size={16} className="text-accent" />
          {user.hasPassword ? 'Changer de mot de passe' : 'Définir un mot de passe'}
        </h2>
        {!user.hasPassword && (
          <p className="mt-1 text-sm text-muted">
            Ton compte utilise Google : définis un mot de passe pour pouvoir aussi te connecter
            par e-mail.
          </p>
        )}
        <form onSubmit={handlePassword} className="mt-4 flex max-w-md flex-col gap-4">
          {user.hasPassword && (
            <Input
              label="Mot de passe actuel"
              type="password"
              required
              autoComplete="current-password"
              value={pwd.current}
              onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
            />
          )}
          <Input
            label="Nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            hint="8 caractères minimum."
            value={pwd.next}
            onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={pwd.confirm}
            onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
          />

          {(pwdError || savePassword.error) && (
            <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {pwdError ??
                (savePassword.error instanceof Error ? savePassword.error.message : 'Erreur')}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            {pwdSaved && <p className="text-sm font-medium text-success">Mot de passe mis à jour ✓</p>}
            <Button type="submit" loading={savePassword.isPending}>
              Mettre à jour
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
