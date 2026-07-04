import { xpForLevel } from '@one-mission/shared'
import { useMutation } from '@tanstack/react-query'
import { Camera, Flame, Sparkles, Trophy, Zap } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { updateProfile, type ProfilePayload } from '@/api/users'
import { Avatar, Button, Card, Input, ProgressBar } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'

/** Redimensionne l'image en carré ≤ 256 px et renvoie une data-URL compacte. */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = Math.min(256, bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  canvas.getContext('2d')!.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame
  label: string
  value: string
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-lg font-bold tracking-tight">{value}</p>
      </div>
    </Card>
  )
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const fileInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    username: user?.username ?? '',
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  })
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (payload: ProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const avatar = useMutation({
    mutationFn: async (file: File) => updateProfile({ avatarUrl: await fileToAvatarDataUrl(file) }),
  })

  if (!user) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate({
      username: form.username.trim(),
      email: form.email.trim(),
      firstName: form.firstName.trim() || null,
      lastName: form.lastName.trim() || null,
    })
  }

  const xpForNext = xpForLevel(user.level)
  const xpPercent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0
  const memberSince = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
      <p className="mt-1 text-sm text-muted">Ton identité de joueur, membre depuis {memberSince}.</p>

      {/* Identité + progression */}
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <button
            onClick={() => fileInput.current?.click()}
            className="group relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            title="Changer d'avatar"
          >
            <Avatar src={user.avatarUrl} name={user.username} size={84} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={22} className="text-white" />
            </span>
            {avatar.isPending && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white">
                …
              </span>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) avatar.mutate(file)
              e.target.value = ''
            }}
          />

          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold">{user.username}</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-accent">{user.level}</span>
              <span className="text-sm text-muted">niveau</span>
            </p>
            <ProgressBar value={xpPercent} className="mt-2" />
            <p className="mt-1.5 text-xs text-muted">
              {user.currentXp}/{xpForNext} XP avant le niveau {user.level + 1}
            </p>
          </div>
        </div>
        {avatar.error && (
          <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {avatar.error instanceof Error ? avatar.error.message : "Impossible de changer l'avatar"}
          </p>
        )}
      </Card>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Zap} label="XP totale" value={String(user.totalXp)} />
        <StatTile icon={Sparkles} label="Niveau" value={String(user.level)} />
        <StatTile icon={Flame} label="Série actuelle" value={`${user.currentStreak} j`} />
        <StatTile icon={Trophy} label="Meilleure série" value={`${user.longestStreak} j`} />
      </div>

      {/* Informations du compte */}
      <Card className="mt-4 p-6">
        <h2 className="font-semibold">Informations du compte</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Prénom"
              maxLength={50}
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <Input
              label="Nom"
              maxLength={50}
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Pseudo"
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            <Input
              label="E-mail"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          {save.error && (
            <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {save.error instanceof Error ? save.error.message : 'Erreur'}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            {saved && <p className="text-sm font-medium text-success">Profil mis à jour ✓</p>}
            <Button type="submit" loading={save.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
