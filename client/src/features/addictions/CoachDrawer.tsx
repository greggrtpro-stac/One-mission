import { getFeature, type AddictionDto, type CoachMessageDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpenText, HeartHandshake, Lock, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addictionsApi } from '@/api/deepwork'
import { coachApi } from '@/api/coach'
import { Button, Spinner } from '@/components/ui'
import { PlanBadge } from '@/features/subscription/PlanBadge'
import { usePlan } from '@/features/subscription/useSubscription'
import { cn } from '@/lib/cn'

/** Suggestions envoyées telles quelles : le prompt système sait y répondre. */
const QUICK_ACTIONS = [
  { label: '🔥 Une envie me prend', text: "Une envie très forte me prend là, maintenant. Aide-moi à la gérer." },
  { label: '🎯 Défi du jour', text: "Propose-moi un défi pour aujourd'hui, adapté à ma progression." },
  { label: '🔁 Habitude de remplacement', text: 'Propose-moi une habitude de remplacement adaptée à mon addiction.' },
  { label: '📊 Bilan de la semaine', text: 'Fais-moi un bilan de mes progrès de la semaine, avec mes chiffres.' },
]

function Bubble({ message }: { message: CoachMessageDto }) {
  const isUser = message.role === 'USER'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'rounded-br-md bg-accent text-on-accent'
            : 'rounded-bl-md border border-line bg-surface-2',
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-surface-2 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-muted"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  )
}

interface CoachDrawerProps {
  addiction: AddictionDto | null
  onClose: () => void
}

/** Messagerie du coach IA — un fil de conversation par addiction. */
export function CoachDrawer({ addiction, onClose }: CoachDrawerProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const addictionId = addiction?.id ?? null
  const { has: hasPlan } = usePlan()
  const hasCoachAi = hasPlan('coach_ai')

  const thread = useQuery({
    queryKey: ['coach', addictionId],
    queryFn: () => coachApi.thread(addictionId!),
    enabled: addictionId !== null && hasCoachAi,
  })

  const send = useMutation({
    mutationFn: (content: string) => coachApi.send(addictionId!, content),
    onSuccess: () => {
      setDraft('')
      void queryClient.invalidateQueries({ queryKey: ['coach', addictionId] })
    },
  })

  const toggleJournal = useMutation({
    mutationFn: (share: boolean) => addictionsApi.update(addictionId!, { shareJournal: share }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coach', addictionId] })
      void queryClient.invalidateQueries({ queryKey: ['addictions'] })
    },
  })

  const messages = thread.data?.messages ?? []
  const aiAvailable = thread.data?.aiAvailable ?? true
  const shareJournal = thread.data?.shareJournal ?? false

  // Toujours coller au dernier message (nouveaux messages, indicateur de frappe).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, send.isPending])

  useEffect(() => {
    if (!addictionId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addictionId, onClose])

  function handleSend(text?: string) {
    const content = (text ?? draft).trim()
    if (!content || send.isPending || !aiAvailable) return
    send.mutate(content)
  }

  return (
    <AnimatePresence>
      {addiction && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.section
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Coach IA — ${addiction.name}`}
          >
            {/* En-tête */}
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg">
                {addiction.icon || <HeartHandshake size={18} className="text-accent" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Coach — {addiction.name}</p>
                <p className="text-xs text-muted">Accompagnement personnalisé, sans jugement</p>
              </div>
              <button
                onClick={() => toggleJournal.mutate(!shareJournal)}
                disabled={toggleJournal.isPending}
                title={
                  shareJournal
                    ? 'Le coach peut lire ton journal — clique pour retirer l’accès'
                    : 'Autoriser le coach à lire ton journal pour des conseils plus personnalisés'
                }
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  shareJournal
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <BookOpenText size={14} /> Journal {shareJournal ? 'partagé' : 'privé'}
              </button>
              <button
                onClick={onClose}
                aria-label="Fermer la conversation"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X size={18} />
              </button>
            </header>

            {/* Fil de messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!hasCoachAi ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                    <Lock size={24} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{getFeature('coach_ai').label}</h3>
                    <p className="mt-1.5 max-w-xs text-sm text-muted">
                      {getFeature('coach_ai').description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">Nécessite</span>
                    <PlanBadge plan="MAX" />
                  </div>
                  <Link to="/app/level-up">
                    <Button className="glow-accent">Débloquer sur Level Up</Button>
                  </Link>
                </div>
              ) : thread.isLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner className="text-accent" />
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <Bubble key={m.id} message={m} />
                  ))}
                  {send.isPending && (
                    <>
                      <Bubble
                        message={{
                          id: 'pending',
                          role: 'USER',
                          content: send.variables ?? '',
                          createdAt: '',
                        }}
                      />
                      <TypingIndicator />
                    </>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Zone de saisie */}
            <footer className="border-t border-line p-3">
              {!hasCoachAi ? null : !aiAvailable ? (
                <p className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
                  Le coach IA n'est pas configuré sur ce serveur (clé API manquante). L'historique
                  reste consultable.
                </p>
              ) : (
                <>
                  <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => handleSend(a.text)}
                        disabled={send.isPending}
                        className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>

                  {send.error && (
                    <p className="mb-2 rounded-xl bg-danger-soft px-3.5 py-2 text-xs text-danger">
                      {send.error instanceof Error ? send.error.message : 'Erreur'} — ton message
                      n'a pas été perdu, réessaie.
                    </p>
                  )}

                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      rows={Math.min(4, Math.max(1, draft.split('\n').length))}
                      maxLength={4000}
                      placeholder="Écris à ton coach…"
                      className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-transparent focus:ring-2 focus:ring-accent/60 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={send.isPending || draft.trim().length === 0}
                      aria-label="Envoyer"
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      <Send size={17} />
                    </button>
                  </div>
                </>
              )}
            </footer>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  )
}
