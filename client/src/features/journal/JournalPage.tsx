import type { JournalEntryDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenText, Check, Lightbulb, Sparkles, ThumbsUp, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { journalApi } from '@/api/journal'
import { Badge, Button, Card, Spinner, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { todayIso } from '@/lib/dates'
import { applyXpResult } from '@/stores/xpFx'

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function AnalysisSection({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof ThumbsUp
  title: string
  items: string[]
  tone: 'success' | 'accent' | 'neutral'
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p
        className={cn(
          'flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase',
          tone === 'success' ? 'text-success' : tone === 'accent' ? 'text-accent' : 'text-muted',
        )}
      >
        <Icon size={13} /> {title}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-line-strong" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AnalysisCard({ entry }: { entry: JournalEntryDto }) {
  const a = entry.aiAnalysis
  if (!a) return null
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles size={15} className="text-accent" /> Analyse du coach
        </h2>
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-accent tabular-nums">{a.score}</span>
          <span className="text-xs text-muted">/10</span>
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed italic">« {a.summary} »</p>
      <div className="mt-4 flex flex-col gap-4">
        <AnalysisSection icon={ThumbsUp} title="Points forts" items={a.positives} tone="success" />
        <AnalysisSection icon={TrendingUp} title="À améliorer" items={a.improvements} tone="accent" />
        <AnalysisSection icon={Lightbulb} title="Conseils pour demain" items={a.advice} tone="neutral" />
      </div>
    </Card>
  )
}

export function JournalPage() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [content, setContent] = useState('')

  const listQuery = useQuery({ queryKey: ['journal'], queryFn: journalApi.list })
  const entryQuery = useQuery({
    queryKey: ['journal', selectedDate],
    queryFn: () => journalApi.get(selectedDate),
  })

  const entry = entryQuery.data?.entry ?? null
  const aiAvailable = listQuery.data?.aiAvailable ?? false

  // Recharge l'éditeur quand on change de jour.
  useEffect(() => {
    setContent(entry?.content ?? '')
  }, [selectedDate, entry?.content])

  const save = useMutation({
    mutationFn: () => journalApi.save(selectedDate, content.trim()),
    onSuccess: (result) => {
      applyXpResult(result.xp)
      void queryClient.invalidateQueries({ queryKey: ['journal'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const analyze = useMutation({
    mutationFn: () => journalApi.analyze(selectedDate),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['journal'] }),
  })

  const entries = listQuery.data?.entries ?? []
  const isToday = selectedDate === todayIso()
  const dirty = content.trim() !== (entry?.content ?? '').trim()
  const canAnalyze = Boolean(entry) && !dirty && !entry?.aiAnalysis

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
      <p className="mt-1 text-sm text-muted">
        Quelques lignes par jour : ce qui a été fait, ressenti, appris. Ton coach IA peut ensuite
        analyser ta journée.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[16rem,1fr]">
        {/* Historique */}
        <Card className="h-fit p-3 max-lg:order-2">
          <p className="px-2 pt-1 text-xs font-bold tracking-wide text-muted uppercase">
            Entrées récentes
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {!entries.some((e) => e.date === todayIso()) && (
              <button
                onClick={() => setSelectedDate(todayIso())}
                className={cn(
                  'flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                  isToday ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-surface-2',
                )}
              >
                Aujourd'hui <Badge variant="accent">à écrire</Badge>
              </button>
            )}
            {entries.length === 0 && entries.every((e) => e.date !== todayIso()) && (
              <p className="px-2.5 py-3 text-sm text-faint">Aucune entrée pour l'instant.</p>
            )}
            {entries.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedDate(e.date)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                  e.date === selectedDate
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-muted hover:bg-surface-2',
                )}
              >
                <span className="truncate capitalize">
                  {e.date === todayIso() ? "Aujourd'hui" : formatDateFr(e.date)}
                </span>
                {e.aiScore != null && (
                  <span className="shrink-0 text-xs font-bold tabular-nums">{e.aiScore}/10</span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Éditeur + analyse */}
        <div className="flex flex-col gap-4 max-lg:order-1">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold capitalize">
                <BookOpenText size={17} className="text-accent" /> {formatDateFr(selectedDate)}
              </h2>
              {entry && !dirty && (
                <Badge variant="success">
                  <Check size={11} /> enregistrée
                </Badge>
              )}
            </div>

            {entryQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="text-accent" />
              </div>
            ) : (
              <>
                <Textarea
                  className="mt-4 min-h-44"
                  maxLength={20000}
                  placeholder={
                    isToday
                      ? "Comment s'est passée ta journée ? Victoires, difficultés, apprentissages…"
                      : 'Rien d’écrit ce jour-là.'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />

                {(save.error || analyze.error) && (
                  <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                    {((save.error ?? analyze.error) as Error)?.message ?? 'Erreur'}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {aiAvailable && entry && !entry.aiAnalysis && (
                    <Button
                      variant="secondary"
                      onClick={() => analyze.mutate()}
                      loading={analyze.isPending}
                      disabled={!canAnalyze}
                      title={dirty ? "Enregistre d'abord tes modifications" : undefined}
                    >
                      <Sparkles size={15} /> Analyser ma journée
                    </Button>
                  )}
                  <Button
                    onClick={() => save.mutate()}
                    loading={save.isPending}
                    disabled={!dirty || content.trim().length === 0}
                  >
                    {entry ? 'Mettre à jour' : 'Enregistrer (+15 XP)'}
                  </Button>
                </div>
              </>
            )}
          </Card>

          {analyze.isPending && (
            <Card className="flex items-center gap-3 p-5 text-sm text-muted">
              <Spinner className="text-accent" /> Le coach lit ton entrée…
            </Card>
          )}
          {entry && <AnalysisCard entry={entry} />}
        </div>
      </div>
    </div>
  )
}
