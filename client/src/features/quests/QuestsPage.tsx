import {
  CATEGORY_LABELS,
  QUEST_CATEGORIES,
  type QuestCategory,
  type QuestDto,
} from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Plus, Swords, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { mainQuestApi, questsApi } from '@/api/quests'
import { Button, ConfirmDialog, Select, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { relativeDay } from '@/lib/dates'
import { applyXpResult } from '@/stores/xpFx'
import { MainQuestCard } from './MainQuestCard'
import { QuestCard } from './QuestCard'
import { QuestFormModal } from './QuestFormModal'

type Group = { key: string; label: string; quests: QuestDto[] }

export function QuestsPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<QuestDto | undefined>(undefined)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [showDone, setShowDone] = useState(false)

  const questsQuery = useQuery({ queryKey: ['quests'], queryFn: questsApi.list })
  const mainQuestQuery = useQuery({ queryKey: ['main-quest'], queryFn: mainQuestApi.get })

  const toggle = useMutation({
    mutationFn: (quest: QuestDto) =>
      quest.status === 'DONE' ? questsApi.uncomplete(quest.id) : questsApi.complete(quest.id),
    onSuccess: (result) => {
      applyXpResult(result.xp)
      void queryClient.invalidateQueries({ queryKey: ['quests'] })
    },
  })

  const [toDelete, setToDelete] = useState<QuestDto | null>(null)
  const remove = useMutation({
    mutationFn: (quest: QuestDto) => questsApi.remove(quest.id),
    onSuccess: (result) => {
      applyXpResult(result.xp)
      void queryClient.invalidateQueries({ queryKey: ['quests'] })
      setToDelete(null)
    },
  })

  const all = useMemo(
    () =>
      (questsQuery.data?.quests ?? []).filter(
        (q) => categoryFilter === 'ALL' || q.category === categoryFilter,
      ),
    [questsQuery.data, categoryFilter],
  )

  const { groups, doneQuests } = useMemo(() => {
    const active = all.filter((q) => q.status !== 'DONE' && q.status !== 'CANCELLED')
    const done = all.filter((q) => q.status === 'DONE')

    const late: QuestDto[] = []
    const today: QuestDto[] = []
    const tomorrow: QuestDto[] = []
    const later: QuestDto[] = []
    for (const q of active) {
      const rel = relativeDay(q.dueDate)
      if (rel === 'past') late.push(q)
      else if (rel === 'today') today.push(q)
      else if (rel === 'tomorrow') tomorrow.push(q)
      else later.push(q)
    }

    const groups: Group[] = [
      { key: 'late', label: 'En retard', quests: late },
      { key: 'today', label: "Aujourd'hui", quests: today },
      { key: 'tomorrow', label: 'Demain', quests: tomorrow },
      { key: 'later', label: 'À venir', quests: later },
    ].filter((g) => g.quests.length > 0)

    return { groups, doneQuests: done }
  }, [all])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(quest: QuestDto) {
    setEditing(quest)
    setFormOpen(true)
  }

  function handleDelete(quest: QuestDto) {
    setToDelete(quest)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quêtes</h1>
          <p className="mt-1 text-sm text-muted">
            Chaque quête terminée te rapporte de l'expérience.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nouvelle quête
        </Button>
      </div>

      <div className="mt-6">
        <MainQuestCard mainQuest={mainQuestQuery.data?.mainQuest ?? null} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Mes quêtes</h2>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-44"
          aria-label="Filtrer par catégorie"
        >
          <option value="ALL">Toutes les catégories</option>
          {QUEST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c as QuestCategory]}
            </option>
          ))}
        </Select>
      </div>

      {questsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-accent" />
        </div>
      ) : groups.length === 0 && doneQuests.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Swords size={24} />
          </span>
          <p className="font-semibold">Aucune quête pour l'instant</p>
          <p className="max-w-sm text-sm text-muted">
            Crée ta première quête et commence à gagner de l'XP.
          </p>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Créer une quête
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key}>
              <h3
                className={cn(
                  'mb-2 text-xs font-bold tracking-[0.14em] uppercase',
                  group.key === 'late' ? 'text-danger' : 'text-faint',
                )}
              >
                {group.label} · {group.quests.length}
              </h3>
              <div className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout">
                  {group.quests.map((q) => (
                    <QuestCard
                      key={q.id}
                      quest={q}
                      onToggle={(quest) => toggle.mutate(quest)}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      disabled={toggle.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}

          {doneQuests.length > 0 && (
            <section>
              <button
                onClick={() => setShowDone((v) => !v)}
                className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-[0.14em] text-faint uppercase transition-colors hover:text-muted"
              >
                <motion.span animate={{ rotate: showDone ? 0 : -90 }}>
                  <ChevronDown size={14} />
                </motion.span>
                Terminées · {doneQuests.length}
              </button>
              <AnimatePresence mode="popLayout">
                {showDone && (
                  <div className="flex flex-col gap-2">
                    {doneQuests.map((q) => (
                      <QuestCard
                        key={q.id}
                        quest={q}
                        onToggle={(quest) => toggle.mutate(quest)}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        disabled={toggle.isPending}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>
      )}

      <QuestFormModal open={formOpen} onClose={() => setFormOpen(false)} quest={editing} />

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
        icon={Trash2}
        tone="danger"
        title="Supprimer cette quête ?"
        description={
          <>
            <p>Cette action supprimera définitivement cette quête.</p>
            <p>Cette opération est irréversible.</p>
          </>
        }
        confirmLabel="Supprimer"
        loading={remove.isPending}
      />
    </div>
  )
}
