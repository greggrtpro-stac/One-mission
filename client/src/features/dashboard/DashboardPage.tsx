import { xpForLevel, type QuestDto, type WeeklyQuestDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpenText,
  Check,
  Flame,
  Quote,
  ShieldCheck,
  Swords,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { mainQuestApi, questsApi } from '@/api/quests'
import { dashboardApi, weeklyApi } from '@/api/weekly'
import { Card, ProgressBar } from '@/components/ui'
import { MainQuestCard } from '@/features/quests/MainQuestCard'
import { QuestCard } from '@/features/quests/QuestCard'
import { cn } from '@/lib/cn'
import { relativeDay } from '@/lib/dates'
import { useAuthStore } from '@/stores/auth'
import { applyXpResult } from '@/stores/xpFx'

function StatTile({
  icon: Icon,
  label,
  value,
  accent = false,
  index,
}: {
  icon: typeof Flame
  label: string
  value: string
  accent?: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="flex items-center gap-3.5 p-4">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            accent ? 'bg-accent text-on-accent' : 'bg-accent-soft text-accent',
          )}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
        </div>
      </Card>
    </motion.div>
  )
}

function formatMinutes(seconds: number): string {
  const min = Math.round(seconds / 60)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const summary = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary })
  const quests = useQuery({ queryKey: ['quests'], queryFn: questsApi.list })
  const weekly = useQuery({ queryKey: ['weekly-quests'], queryFn: weeklyApi.list })
  const mainQuest = useQuery({ queryKey: ['main-quest'], queryFn: mainQuestApi.get })

  const toggleQuest = useMutation({
    mutationFn: (quest: QuestDto) =>
      quest.status === 'DONE' ? questsApi.uncomplete(quest.id) : questsApi.complete(quest.id),
    onSuccess: (result) => {
      applyXpResult(result.xp)
      void queryClient.invalidateQueries({ queryKey: ['quests'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const toggleWeekly = useMutation({
    mutationFn: (q: WeeklyQuestDto) =>
      q.completedAt ? weeklyApi.uncomplete(q.id) : weeklyApi.complete(q.id),
    onSuccess: (result) => {
      applyXpResult(result.xp)
      void queryClient.invalidateQueries({ queryKey: ['weekly-quests'] })
    },
  })

  if (!user) return null

  const xpForNext = xpForLevel(user.level)
  const xpPercent = xpForNext > 0 ? (user.currentXp / xpForNext) * 100 : 0
  const greeting = user.firstName ?? user.username
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const todayQuests = (quests.data?.quests ?? [])
    .filter((q) => {
      if (q.status === 'CANCELLED') return false
      const rel = relativeDay(q.dueDate)
      return (rel === 'today' || rel === 'past') && q.status !== 'DONE'
    })
    .slice(0, 5)

  const weeklyQuests = weekly.data?.weeklyQuests ?? []
  const weeklyDone = weeklyQuests.filter((q) => q.completedAt).length
  const s = summary.data

  return (
    <div className="mx-auto max-w-6xl">
      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted capitalize">{today}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Salut, <span className="text-accent">{greeting}</span> 👋
        </h1>
      </motion.div>

      {/* Tuiles de stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={TrendingUp} label="Niveau" value={String(user.level)} accent index={0} />
        <StatTile
          icon={Flame}
          label="Série d'activité"
          value={`${user.currentStreak} j`}
          index={1}
        />
        <StatTile
          icon={Timer}
          label="DeepWork aujourd'hui"
          value={s ? formatMinutes(s.deepWorkTodaySeconds) : '—'}
          index={2}
        />
        <StatTile
          icon={ShieldCheck}
          label="Sans addiction"
          value={s?.addictionDays != null ? `${s.addictionDays} j` : '—'}
          index={3}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <MainQuestCard mainQuest={mainQuest.data?.mainQuest ?? null} compact />

          {/* Quêtes du jour */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Swords size={17} className="text-accent" /> Quêtes du jour
              </h2>
              <Link
                to="/app/quests"
                className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
              >
                Tout voir <ArrowRight size={13} />
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {todayQuests.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  {s && s.questsDoneToday > 0
                    ? `Bien joué : ${s.questsDoneToday} quête${s.questsDoneToday > 1 ? 's' : ''} terminée${s.questsDoneToday > 1 ? 's' : ''} aujourd'hui. 🎉`
                    : 'Aucune quête prévue aujourd’hui. Crée-en une !'}
                </p>
              ) : (
                todayQuests.map((q) => (
                  <QuestCard
                    key={q.id}
                    quest={q}
                    onToggle={(quest) => toggleQuest.mutate(quest)}
                    disabled={toggleQuest.isPending}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Hebdomadaires */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Cette semaine</h2>
              <Link
                to="/app/weekly"
                className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
              >
                Gérer <ArrowRight size={13} />
              </Link>
            </div>
            {weeklyQuests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Aucune quête hebdomadaire définie.
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar
                    value={weeklyQuests.length ? (weeklyDone / weeklyQuests.length) * 100 : 0}
                    size="sm"
                    className="flex-1"
                  />
                  <span className="text-xs text-muted">
                    {weeklyDone}/{weeklyQuests.length}
                  </span>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {weeklyQuests.slice(0, 5).map((q) => (
                    <li key={q.id}>
                      <button
                        onClick={() => toggleWeekly.mutate(q)}
                        disabled={toggleWeekly.isPending}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                            q.completedAt
                              ? 'border-accent bg-accent text-on-accent'
                              : 'border-line-strong',
                          )}
                        >
                          {q.completedAt && <Check size={12} strokeWidth={3.5} />}
                        </span>
                        <span className={cn(q.completedAt && 'text-muted line-through')}>
                          {q.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="flex flex-col gap-4">
          {/* Progression */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Progression</h2>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-accent">{user.level}</span>
              <span className="text-sm text-muted">niveau</span>
            </p>
            <ProgressBar value={xpPercent} className="mt-3" />
            <p className="mt-2 text-xs text-muted">
              {user.currentXp}/{xpForNext} XP — encore{' '}
              <span className="font-semibold text-ink">{xpForNext - user.currentXp} XP</span> avant
              le niveau {user.level + 1}
            </p>
            <p className="mt-3 border-t border-line pt-3 text-xs text-faint">
              XP totale : <span className="font-semibold text-muted">{user.totalXp}</span>
            </p>
          </Card>

          {/* Citation du jour */}
          <Card className="relative overflow-hidden p-5">
            <Quote size={44} className="absolute -top-1 -right-1 rotate-12 text-accent opacity-15" />
            <h2 className="text-sm font-semibold">Citation du jour</h2>
            {s ? (
              <>
                <p className="mt-3 text-sm leading-relaxed italic">« {s.quote.text} »</p>
                {s.quote.author && (
                  <p className="mt-2 text-xs font-medium text-accent">— {s.quote.author}</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">…</p>
            )}
          </Card>

          {/* Résumé de la journée */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Résumé du jour</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted">Quêtes terminées</span>
                <span className="font-semibold">{s?.questsDoneToday ?? 0}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted">DeepWork</span>
                <span className="font-semibold">
                  {s ? formatMinutes(s.deepWorkTodaySeconds) : '—'}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted">Hebdo cette semaine</span>
                <span className="font-semibold">
                  {weeklyDone}/{weeklyQuests.length}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted">Journal</span>
                {s?.journalWrittenToday ? (
                  <span className="font-semibold text-success">Écrit ✓</span>
                ) : (
                  <Link
                    to="/app/journal"
                    className="flex items-center gap-1 font-medium text-accent hover:text-accent-hover"
                  >
                    <BookOpenText size={13} /> À écrire
                  </Link>
                )}
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
