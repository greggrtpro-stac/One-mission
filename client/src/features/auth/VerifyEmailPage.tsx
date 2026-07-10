import type { VerifyEmailStatus } from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, MailQuestion, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '@/api/auth'
import { Button, Spinner } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { ResendVerificationForm } from './ResendVerificationForm'

function StateCard({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode
  tone: 'success' | 'danger' | 'warning' | 'neutral'
  title: string
  children?: ReactNode
}) {
  const toneClasses: Record<typeof tone, string> = {
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
    neutral: 'bg-accent-soft text-accent',
  }
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className={`flex size-12 items-center justify-center rounded-full ${toneClasses[tone]}`}>
        {icon}
      </span>
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  )
}

function VerifiedResult({ heading }: { heading: string }) {
  return (
    <div className="flex flex-col gap-5">
      <StateCard icon={<CheckCircle2 size={22} />} tone="success" title={heading}>
        <p className="text-sm text-muted">Tu peux maintenant te connecter à ton compte.</p>
      </StateCard>
      <Link to="/login">
        <Button size="lg" className="w-full">
          Se connecter
        </Button>
      </Link>
    </div>
  )
}

function ExpiredOrInvalidResult({ variant }: { variant: 'expired' | 'invalid' }) {
  const copy =
    variant === 'expired'
      ? {
          title: 'Ce lien a expiré',
          detail: 'Les liens de confirmation sont valables 24 heures. Demande-en un nouveau ci-dessous.',
        }
      : {
          title: 'Lien de vérification invalide',
          detail:
            'Ce lien est incorrect ou a déjà été utilisé. Indique ton adresse pour en recevoir un nouveau.',
        }
  return (
    <div className="flex flex-col gap-5">
      <StateCard
        icon={variant === 'expired' ? <Clock size={22} /> : <XCircle size={22} />}
        tone={variant === 'expired' ? 'warning' : 'danger'}
        title={copy.title}
      >
        <p className="text-sm text-muted">{copy.detail}</p>
      </StateCard>
      <ResendVerificationForm />
      <p className="text-center text-sm text-muted">
        <Link to="/login" className="text-accent hover:text-accent-hover">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}

const STATE_TITLES: Record<VerifyEmailStatus, string> = {
  success: 'Vérification réussie',
  already_verified: 'Déjà vérifié',
  expired: 'Lien expiré',
  invalid: 'Vérification échouée',
}

function ResultByStatus({ status }: { status: VerifyEmailStatus }) {
  switch (status) {
    case 'success':
      return <VerifiedResult heading="Adresse e-mail vérifiée !" />
    case 'already_verified':
      return (
        <div className="flex flex-col gap-5">
          <StateCard icon={<MailQuestion size={22} />} tone="neutral" title="Cette adresse est déjà vérifiée">
            <p className="text-sm text-muted">Rien à faire de plus, tu peux te connecter.</p>
          </StateCard>
          <Link to="/login">
            <Button size="lg" className="w-full">
              Se connecter
            </Button>
          </Link>
        </div>
      )
    case 'expired':
      return <ExpiredOrInvalidResult variant="expired" />
    case 'invalid':
      return <ExpiredOrInvalidResult variant="invalid" />
  }
}

/**
 * Page publique ouverte depuis le lien de l'e-mail de confirmation.
 * Un seul appel API au chargement détermine l'état affiché parmi les 4 prévus :
 * succès, déjà vérifié, expiré, ou invalide (voir verification.service.ts).
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const uid = params.get('uid') ?? undefined

  const query = useQuery({
    queryKey: ['verify-email', token, uid],
    queryFn: () => verifyEmail(token, uid),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  })

  // Chargement tant que l'appel est en vol ; token absent de l'URL ou échec
  // réseau retombent directement sur l'état générique « invalide ».
  const loading = Boolean(token) && query.isLoading
  const status: VerifyEmailStatus = query.data?.status ?? 'invalid'

  return (
    <AuthLayout
      title={loading ? 'Vérification en cours' : STATE_TITLES[status]}
      subtitle={loading ? 'Un instant, on vérifie ton lien…' : undefined}
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-accent" />
        </div>
      ) : (
        <ResultByStatus status={status} />
      )}
    </AuthLayout>
  )
}
