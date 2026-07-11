import {
  DEFAULT_FRIEND_PREFS,
  DEFAULT_NOTIFICATIONS,
  isPasswordAcceptable,
  PASSWORD_MIN_LENGTH,
  type FriendPrefs,
  type Language,
  type NotificationPrefs,
  type SessionDevice,
  type SessionInfo,
} from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  Camera,
  Download,
  Eye,
  Globe,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  MonitorSmartphone,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Tablet,
  UserRound,
} from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  changePassword,
  deleteAccount,
  downloadMyData,
  fetchSessions,
  logoutAllDevices,
  revokeSession,
  updateProfile,
  type ProfilePayload,
} from '@/api/users'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  PasswordInput,
  Select,
  Spinner,
  Toggle,
} from '@/components/ui'
import { PasswordChecklist } from '@/features/auth/PasswordChecklist'
import { CommunicationCards } from './CommunicationCards'
import { cn } from '@/lib/cn'
import { LANGUAGE_OPTIONS, useI18n } from '@/lib/i18n'
import { chooseTheme } from '@/lib/themePreference'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemeName } from '@/stores/theme'

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

function SectionTitle({ icon: Icon, children }: { icon: typeof UserRound; children: ReactNode }) {
  return (
    <h2 className="mt-10 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase first:mt-6">
      <Icon size={15} className="text-accent" />
      {children}
    </h2>
  )
}

function ErrorNote({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) return null
  return (
    <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {error instanceof Error ? error.message : fallback}
    </p>
  )
}

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

// ── Compte ───────────────────────────────────────────────────

function AccountCard() {
  const user = useAuthStore((s) => s.user)!
  const fileInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username,
    email: user.email,
    phone: user.phone ?? '',
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

  const memberSince = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate({
      firstName: form.firstName.trim() || null,
      lastName: form.lastName.trim() || null,
      username: form.username.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    })
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-5">
        <button
          onClick={() => fileInput.current?.click()}
          className="group relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          title="Changer de photo de profil"
        >
          <Avatar src={user.avatarUrl} name={user.username} size={72} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={20} className="text-white" />
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
          <p className="text-lg font-bold">{user.username}</p>
          <p className="text-sm text-muted">Compte créé le {memberSince}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.hasGoogle ? (
              <Badge variant="success">Connexion Google liée</Badge>
            ) : (
              <Badge variant="outline">Connexion Google non liée</Badge>
            )}
            {!user.hasPassword && <Badge variant="warning">Aucun mot de passe défini</Badge>}
          </div>
        </div>
      </div>
      <ErrorNote error={avatar.error} fallback="Impossible de changer la photo de profil" />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Téléphone (optionnel)"
            type="tel"
            maxLength={30}
            placeholder="+33 6 12 34 56 78"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>

        <ErrorNote error={save.error} fallback="Erreur" />

        <div className="flex items-center justify-end gap-3">
          {saved && <p className="text-sm font-medium text-success">Compte mis à jour ✓</p>}
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ── Préférences ──────────────────────────────────────────────

function PreferencesCards() {
  const user = useAuthStore((s) => s.user)!
  const theme = useThemeStore((s) => s.theme)
  const queryClient = useQueryClient()

  // Langue et interrupteurs s'appliquent immédiatement et suivent le compte.
  const save = useMutation({ mutationFn: (payload: ProfilePayload) => updateProfile(payload) })
  const exportData = useMutation({ mutationFn: downloadMyData })

  // Le thème passe par le point d'entrée unique (application + compte).
  const handleTheme = chooseTheme

  const notifications: NotificationPrefs = { ...DEFAULT_NOTIFICATIONS, ...user.notifications }
  function setNotification(key: keyof NotificationPrefs, value: boolean) {
    save.mutate({ notifications: { ...notifications, [key]: value } })
  }

  const friendPrefs: FriendPrefs = { ...DEFAULT_FRIEND_PREFS, ...user.friendPrefs }
  function setFriendPref(key: keyof FriendPrefs, value: boolean) {
    save.mutate(
      { friendPrefs: { ...friendPrefs, [key]: value } },
      // L'onglet Amis doit refléter immédiatement le changement (recherche, présence).
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }) },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <Sun size={16} className="text-accent" /> Apparence
        </h3>
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

      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <Globe size={16} className="text-accent" /> Langue
        </h3>
        <p className="mt-1 text-sm text-muted">
          D'autres langues arriveront bientôt — l'application est déjà prête à les accueillir.
        </p>
        <div className="mt-4 max-w-xs">
          <Select
            value={user.language}
            onChange={(e) => save.mutate({ language: e.target.value as Language })}
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.id} value={l.id} disabled={!l.available}>
                {l.label}
                {!l.available ? ' — bientôt' : ''}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <Bell size={16} className="text-accent" /> Notifications
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          <Toggle
            label="Rappels de quêtes"
            description="Être prévenu quand une quête arrive à échéance."
            checked={notifications.questReminders}
            onChange={(v) => setNotification('questReminders', v)}
          />
          <Toggle
            label="Récapitulatif hebdomadaire"
            description="Un résumé de ta progression chaque semaine."
            checked={notifications.weeklyRecap}
            onChange={(v) => setNotification('weeklyRecap', v)}
          />
          <Toggle
            label="Messages du coach"
            description="Encouragements automatiques du coach IA."
            checked={notifications.coachMessages}
            onChange={(v) => setNotification('coachMessages', v)}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <Eye size={16} className="text-accent" /> Confidentialité
        </h3>
        <div className="mt-4">
          <Toggle
            label="Afficher mon profil dans le classement public"
            description="Autoriser les autres joueurs à voir votre profil dans le classement public."
            checked={user.showOnLeaderboard}
            onChange={(v) =>
              save.mutate(
                { showOnLeaderboard: v },
                // Le classement doit refléter le changement immédiatement, sans attendre le staleTime.
                { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] }) },
              )
            }
          />
        </div>

        {/* Système d'amis — respecté partout côté serveur (recherche, demandes, présence). */}
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <Toggle
            label="Autoriser les demandes d'amis"
            description="Les autres joueurs peuvent t'envoyer une demande d'ami."
            checked={friendPrefs.allowFriendRequests}
            onChange={(v) => setFriendPref('allowFriendRequests', v)}
          />
          <Toggle
            label="Autoriser la recherche par pseudo"
            description="Ton pseudo apparaît dans la recherche de joueurs de l'onglet Amis."
            checked={friendPrefs.allowUsernameSearch}
            onChange={(v) => setFriendPref('allowUsernameSearch', v)}
          />
          <Toggle
            label="Afficher mon statut en ligne"
            description="Tes amis voient si tu es en ligne en ce moment."
            checked={friendPrefs.showOnlineStatus}
            onChange={(v) => setFriendPref('showOnlineStatus', v)}
          />
          <Toggle
            label="Afficher ma dernière connexion"
            description="Tes amis voient quand tu t'es connecté pour la dernière fois."
            checked={friendPrefs.showLastSeen}
            onChange={(v) => setFriendPref('showLastSeen', v)}
          />
          <Toggle
            label="Afficher mes statistiques d'addictions sur mon profil public"
            description="Nombre d'addictions suivies et record sans rechute — jamais leurs noms."
            checked={friendPrefs.showAddictionsPublicly}
            onChange={(v) => setFriendPref('showAddictionsPublicly', v)}
          />
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Tes données personnelles</p>
              <p className="mt-0.5 text-sm text-muted">
                Télécharge une copie complète de tes données (RGPD). La suppression du compte se
                fait dans la Zone de danger, plus bas.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={exportData.isPending}
              onClick={() => exportData.mutate()}
            >
              <Download size={14} /> Télécharger mes données
            </Button>
          </div>
          <ErrorNote error={exportData.error} fallback="Export impossible pour le moment" />
          <p className="mt-3 text-xs text-faint">
            Détails du traitement dans la{' '}
            <RouterLink to="/confidentialite" className="text-muted underline hover:text-accent">
              politique de confidentialité
            </RouterLink>
            .
          </p>
        </div>
      </Card>

      <ErrorNote error={save.error} fallback="Impossible d'enregistrer la préférence" />
    </div>
  )
}

// ── Appareils connectés ──────────────────────────────────────

const DEVICE_META: Record<SessionDevice, { label: string; icon: typeof Monitor }> = {
  desktop: { label: 'PC', icon: Monitor },
  mobile: { label: 'Téléphone', icon: Smartphone },
  tablet: { label: 'Tablette', icon: Tablet },
  unknown: { label: 'Appareil', icon: MonitorSmartphone },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DeviceCard({ session, onRevoke }: { session: SessionInfo; onRevoke: () => void }) {
  const meta = DEVICE_META[session.device]
  const Icon = meta.icon

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">
              {meta.label} — {session.os ?? 'Système inconnu'}
            </p>
            {session.isCurrent && <Badge variant="accent">Appareil actuel</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {session.browser ?? 'Navigateur inconnu'} · {session.location ?? 'Localisation inconnue'}
          </p>
          <p className="mt-1 text-xs text-faint">
            Connecté le {formatDateTime(session.connectedAt)} · Dernière activité le{' '}
            {formatDateTime(session.lastActivityAt)}
          </p>
        </div>
        <Button variant="danger-soft" size="sm" onClick={onRevoke}>
          <LogOut size={14} /> Se déconnecter
        </Button>
      </div>
    </Card>
  )
}

function DevicesCards() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [toRevoke, setToRevoke] = useState<SessionInfo | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  const sessions = useQuery({ queryKey: ['sessions'], queryFn: fetchSessions })

  const revoke = useMutation({
    mutationFn: (session: SessionInfo) => revokeSession(session.id),
    onSuccess: (_data, session) => {
      setToRevoke(null)
      if (session.isCurrent) {
        // Le serveur a effacé le cookie de ce navigateur : on ferme aussi côté client.
        useAuthStore.getState().clearSession()
        navigate('/login')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const logoutAll = useMutation({
    mutationFn: logoutAllDevices,
    onSuccess: () => navigate('/login'),
  })

  return (
    <div className="flex flex-col gap-4">
      {sessions.isLoading ? (
        <Card className="flex justify-center p-8">
          <Spinner className="text-accent" />
        </Card>
      ) : sessions.data ? (
        sessions.data.map((s) => (
          <DeviceCard key={s.id} session={s} onRevoke={() => setToRevoke(s)} />
        ))
      ) : (
        <Card className="p-6 text-sm text-muted">
          Impossible de charger les appareils connectés.
        </Card>
      )}
      <ErrorNote error={revoke.error} fallback="Impossible de fermer cette session" />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <LogOut size={16} className="text-danger" /> Se déconnecter de tous les appareils
            </h3>
            <p className="mt-1 text-sm text-muted">
              Ferme toutes les sessions actives, y compris celle-ci. Tu devras te reconnecter
              partout.
            </p>
          </div>
          <Button variant="danger-soft" onClick={() => setConfirmLogoutAll(true)}>
            Tout déconnecter
          </Button>
        </div>
        <ErrorNote error={logoutAll.error} fallback="Impossible de déconnecter les appareils" />
      </Card>

      {/* Confirmation — un seul appareil */}
      <ConfirmDialog
        open={toRevoke !== null}
        onClose={() => setToRevoke(null)}
        onConfirm={() => toRevoke && revoke.mutate(toRevoke)}
        icon={LogOut}
        tone="warning"
        title="Se déconnecter ?"
        description={
          toRevoke?.isCurrent
            ? "C'est l'appareil que tu utilises en ce moment : tu seras redirigé vers la page de connexion."
            : 'La session de cet appareil sera fermée. Les autres appareils restent connectés.'
        }
        confirmLabel="Se déconnecter"
        loading={revoke.isPending}
      />

      {/* Confirmation — tous les appareils */}
      <ConfirmDialog
        open={confirmLogoutAll}
        onClose={() => setConfirmLogoutAll(false)}
        onConfirm={() => logoutAll.mutate()}
        icon={LogOut}
        tone="warning"
        title="Déconnecter tous les appareils ?"
        description="Toutes tes sessions seront fermées immédiatement, y compris celle-ci. Tu devras te reconnecter partout."
        confirmLabel="Déconnecter"
        loading={logoutAll.isPending}
      />
    </div>
  )
}

// ── Sécurité ─────────────────────────────────────────────────

function PasswordCard() {
  const user = useAuthStore((s) => s.user)!
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaved, setPwdSaved] = useState(false)

  const savePassword = useMutation({
    mutationFn: () =>
      changePassword({
        currentPassword: user.hasPassword ? pwd.current : undefined,
        newPassword: pwd.next,
      }),
    onSuccess: () => {
      setPwd({ current: '', next: '', confirm: '' })
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 2500)
    },
  })

  function handlePassword(e: FormEvent) {
    e.preventDefault()
    setPwdError(null)
    if (!isPasswordAcceptable(pwd.next)) {
      setPwdError('Le nouveau mot de passe ne remplit pas encore tous les critères ci-dessous.')
      return
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError('Les deux mots de passe ne correspondent pas.')
      return
    }
    savePassword.mutate()
  }

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <KeyRound size={16} className="text-accent" />
        {user.hasPassword ? 'Changer de mot de passe' : 'Définir un mot de passe'}
      </h3>
      {!user.hasPassword && (
        <p className="mt-1 text-sm text-muted">
          Ton compte utilise Google : définis un mot de passe pour pouvoir aussi te connecter par
          e-mail.
        </p>
      )}
      <form onSubmit={handlePassword} className="mt-4 flex max-w-md flex-col gap-4">
        {user.hasPassword && (
          <PasswordInput
            label="Mot de passe actuel"
            required
            autoComplete="current-password"
            value={pwd.current}
            onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
          />
        )}
        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Nouveau mot de passe"
            required
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            value={pwd.next}
            onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
          />
          <PasswordChecklist password={pwd.next} />
        </div>
        <PasswordInput
          label="Confirmer le nouveau mot de passe"
          required
          autoComplete="new-password"
          value={pwd.confirm}
          onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
          error={
            pwd.confirm.length > 0 && pwd.next !== pwd.confirm
              ? 'Les deux mots de passe ne correspondent pas'
              : undefined
          }
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
  )
}

function SecurityCards() {
  const user = useAuthStore((s) => s.user)!
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePwd, setDeletePwd] = useState('')

  const remove = useMutation({
    mutationFn: () => deleteAccount(user.hasPassword ? deletePwd : undefined),
    onSuccess: () => navigate('/'),
  })

  return (
    <div className="flex flex-col gap-4">
      <PasswordCard />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={16} className="text-accent" /> Authentification à deux facteurs
            </h3>
            <p className="mt-1 text-sm text-muted">
              Une couche de sécurité supplémentaire à la connexion.
            </p>
          </div>
          <Badge variant="accent">Bientôt disponible</Badge>
        </div>
        <div className="mt-4">
          <Toggle
            label="Activer la double authentification"
            description="Cette option sera activable dans une prochaine version."
            checked={user.twoFactorEnabled}
            onChange={() => {}}
            disabled
          />
        </div>
      </Card>

      <Card className="border-danger/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-danger">
              <AlertTriangle size={16} /> Zone de danger
            </h3>
            <p className="mt-1 text-sm text-muted">
              Supprime définitivement ton compte, ta progression, tes quêtes et ton journal.
            </p>
          </div>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Supprimer mon compte
          </Button>
        </div>
      </Card>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer définitivement ton compte ?"
      >
        <p className="text-sm text-muted">
          Cette action est irréversible : niveau, XP, quêtes, sessions DeepWork, addictions et
          journal seront effacés.
        </p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            remove.mutate()
          }}
        >
          {user.hasPassword && (
            <PasswordInput
              label="Confirme avec ton mot de passe"
              required
              autoComplete="current-password"
              value={deletePwd}
              onChange={(e) => setDeletePwd(e.target.value)}
            />
          )}
          <ErrorNote error={remove.error} fallback="Impossible de supprimer le compte" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="danger" loading={remove.isPending}>
              Supprimer définitivement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { t } = useI18n()
  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('settings.subtitle')}</p>

      <SectionTitle icon={UserRound}>{t('settings.account')}</SectionTitle>
      <div className="mt-3">
        <AccountCard />
      </div>

      <SectionTitle icon={Sun}>{t('settings.preferences')}</SectionTitle>
      <div className="mt-3">
        <PreferencesCards />
      </div>

      <SectionTitle icon={Mail}>Communication et notifications</SectionTitle>
      <div className="mt-3">
        <CommunicationCards />
      </div>

      <SectionTitle icon={MonitorSmartphone}>Appareils connectés</SectionTitle>
      <div className="mt-3">
        <DevicesCards />
      </div>

      <SectionTitle icon={ShieldCheck}>{t('settings.security')}</SectionTitle>
      <div className="mt-3">
        <SecurityCards />
      </div>
    </div>
  )
}
