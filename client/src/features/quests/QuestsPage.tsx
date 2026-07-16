import type { QuestCategoryDto, QuestDto } from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ListFilter, Plus, Settings2, Swords, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { mainQuestApi, questCategoriesApi, questsApi } from '@/api/quests'
import { Button, ConfirmDialog, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { relativeDay } from '@/lib/dates'
import { applyXpResult } from '@/stores/xpFx'
import { MainQuestCard } from './MainQuestCard'
import { QuestCard } from './QuestCard'
import { QuestCategoryManagerModal } from './QuestCategoryManagerModal'
import { QuestFormModal } from './QuestFormModal'

type Group = { key: string; label: string; quests: QuestDto[] }

export function QuestsPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editing, setEditing] = useState<QuestDto | undefined>(undefined)
  /** null = toutes les catégories (aucun filtre actif). */
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<ReadonlySet<string> | null>(null)
  const [showDone, setShowDone] = useState(false)

  const questsQuery = useQuery({ queryKey: ['quests'], queryFn: questsApi.list })
  const mainQuestQuery = useQuery({ queryKey: ['main-quest'], queryFn: mainQuestApi.get })
  const categoriesQuery = useQuery({
    queryKey: ['quest-categories'],
    queryFn: () => questCategoriesApi.list().then((r) => r.categories),
  })
  const categories = categoriesQuery.data ?? []

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
      void queryClient.invalidateQueries({ queryKey: ['quest-categories'] })
      setToDelete(null)
    },
  })

  const all = useMemo(
    () =>
      (questsQuery.data?.quests ?? []).filter(
        (q) => selectedCategoryIds === null || selectedCategoryIds.has(q.category.id),
      ),
    [questsQuery.data, selectedCategoryIds],
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
            <Settings2 size={16} /> Gérer les catégories
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Nouvelle quête
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <MainQuestCard mainQuest={mainQuestQuery.data?.mainQuest ?? null} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Mes quêtes</h2>
        <CategoryFilter
          categories={categories}
          selected={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
        />
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
          {selectedCategoryIds !== null && (questsQuery.data?.quests.length ?? 0) > 0 ? (
            <>
              <p className="font-semibold">Aucune quête dans ces catégories</p>
              <p className="max-w-sm text-sm text-muted">
                Élargis le filtre pour retrouver tes autres quêtes.
              </p>
              <Button size="sm" variant="secondary" onClick={() => setSelectedCategoryIds(null)}>
                Afficher toutes les catégories
              </Button>
            </>
          ) : (
            <>
              <p className="font-semibold">Aucune quête pour l'instant</p>
              <p className="max-w-sm text-sm text-muted">
                Crée ta première quête et commence à gagner de l'XP.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} /> Créer une quête
              </Button>
            </>
          )}
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
      <QuestCategoryManagerModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />

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

/**
 * Filtre multi-catégories instantané : menu à cases à cocher, aucun appel
 * réseau (le filtrage se fait sur les quêtes déjà chargées). `selected` à
 * null signifie « toutes » — cocher/décocher construit un sous-ensemble.
 */
function CategoryFilter({
  categories,
  selected,
  onChange,
}: {
  categories: QuestCategoryDto[]
  selected: ReadonlySet<string> | null
  onChange: (next: ReadonlySet<string> | null) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function isChecked(id: string) {
    return selected === null || selected.has(id)
  }

  function toggleCategory(id: string) {
    const next = new Set(selected ?? categories.map((c) => c.id))
    if (next.has(id)) next.delete(id)
    else next.add(id)
    // Tout coché = retour à l'état « aucun filtre ».
    onChange(next.size === categories.length ? null : next)
  }

  const activeCount = selected === null ? categories.length : selected.size
  const filtering = selected !== null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors',
          filtering
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
        )}
      >
        <ListFilter size={15} />
        Catégories
        {filtering && (
          <span className="tabular-nums">
            · {activeCount}/{categories.length}
          </span>
        )}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-line bg-surface p-2 shadow-lg"
          >
            <p className="px-2 pt-1 pb-2 text-[11px] font-bold tracking-[0.14em] text-faint uppercase">
              Afficher uniquement
            </p>
            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted">Aucune catégorie.</p>
              ) : (
                categories.map((category) => {
                  const checked = isChecked(category.id)
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2"
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                          checked
                            ? 'border-accent bg-accent text-on-accent'
                            : 'border-line-strong bg-surface',
                        )}
                      >
                        {checked && <Check size={11} strokeWidth={3.5} />}
                      </span>
                      <span aria-hidden>{category.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{category.name}</span>
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: category.color }}
                        aria-hidden
                      />
                    </button>
                  )
                })
              )}
            </div>
            {filtering && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="mt-1 w-full rounded-lg border-t border-line px-2 py-2 text-left text-sm font-medium text-accent transition-colors hover:bg-surface-2"
              >
                Tout afficher
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
