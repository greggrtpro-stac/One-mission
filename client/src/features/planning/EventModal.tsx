import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  PRIORITY_LABELS,
  PRIORITIES,
  REMINDER_OPTIONS,
  XP_BY_DIFFICULTY,
  type PlanningEventDto,
} from '@one-mission/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Swords, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { planningApi, planningCategoriesApi, type PlanningEventPayload } from '@/api/planning'
import { Badge, Button, ConfirmDialog, Input, Modal, Select, Textarea } from '@/components/ui'
import { fromInputs, toDateInput, toTimeInput } from './time'

interface EventModalProps {
  open: boolean
  onClose: () => void
  /** Créneau pré-rempli (création par clic sur la grille). */
  slot?: { start: Date; end: Date } | null
  /** Événement à éditer, ou undefined pour une création. */
  event?: PlanningEventDto
}

interface FormState {
  title: string
  description: string
  notes: string
  categoryId: string
  priority: string
  date: string
  startTime: string
  endTime: string
  /** '' = pas de rappel, sinon minutes avant le début. */
  reminder: string
}

const emptyForm = (slot?: { start: Date; end: Date } | null): FormState => ({
  title: '',
  description: '',
  notes: '',
  categoryId: '',
  priority: 'MEDIUM',
  date: toDateInput(slot?.start ?? new Date()),
  startTime: toTimeInput(slot?.start ?? new Date()),
  endTime: toTimeInput(slot?.end ?? new Date()),
  reminder: '',
})

export function EventModal({ open, onClose, slot, event }: EventModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(() => emptyForm(slot))
  const [timeError, setTimeError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['planning-categories'],
    queryFn: planningCategoriesApi.list,
    enabled: open,
  })
  const categories = categoriesQuery.data?.categories ?? []

  useEffect(() => {
    if (!open) return
    setTimeError(null)
    setDifficulty('MEDIUM')
    if (event) {
      const start = new Date(event.startAt)
      const end = new Date(event.endAt)
      setForm({
        title: event.title,
        description: event.description ?? '',
        notes: event.notes ?? '',
        categoryId: event.category.id,
        priority: event.priority,
        date: toDateInput(start),
        startTime: toTimeInput(start),
        endTime: toTimeInput(end),
        reminder: event.reminderMinutes === null ? '' : String(event.reminderMinutes),
      })
    } else {
      setForm(emptyForm(slot))
    }
  }, [open, event, slot])

  // Catégorie par défaut à la création, une fois la liste chargée (une
  // catégorie de repli existe toujours — voir ensureDefaultCategories côté serveur).
  useEffect(() => {
    const list = categoriesQuery.data?.categories
    if (event || form.categoryId || !list || list.length === 0) return
    const fallback = list.find((c) => c.isDefault) ?? list[0]!
    setForm((f) => ({ ...f, categoryId: fallback.id }))
  }, [event, form.categoryId, categoriesQuery.data])

  const selectedCategory = categories.find((c) => c.id === form.categoryId)

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['planning'] })
    void queryClient.invalidateQueries({ queryKey: ['planning-stats'] })
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: PlanningEventPayload = {
        title: form.title,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        categoryId: form.categoryId,
        priority: form.priority,
        startAt: fromInputs(form.date, form.startTime).toISOString(),
        endAt: fromInputs(form.date, form.endTime).toISOString(),
        reminderMinutes: form.reminder === '' ? null : Number(form.reminder),
      }
      return event ? planningApi.update(event.id, payload) : planningApi.create(payload)
    },
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const remove = useMutation({
    mutationFn: () => planningApi.remove(event!.id),
    onSuccess: () => {
      invalidate()
      setConfirmDelete(false)
      onClose()
    },
  })

  const convert = useMutation({
    mutationFn: () =>
      planningApi.convertToQuest(event!.id, {
        difficulty,
        dueDate: form.date,
        dueTime: form.startTime,
      }),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['quests'] })
      onClose()
    },
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (fromInputs(form.date, form.endTime) <= fromInputs(form.date, form.startTime)) {
      setTimeError("L'heure de fin doit être après l'heure de début")
      return
    }
    setTimeError(null)
    save.mutate()
  }

  function handleDelete() {
    if (event) setConfirmDelete(true)
  }

  const error = save.error ?? remove.error ?? convert.error

  return (
    <Modal
      open={open}
      onClose={() => {
        // Le dialogue de confirmation gère sa propre fermeture (Échap) : ne
        // pas fermer aussi le formulaire par-dessous tant qu'il est ouvert.
        if (confirmDelete) return
        onClose()
      }}
      title={event ? "Modifier l'événement" : 'Nouvel événement'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {event?.quest && (
          <Badge variant="accent" className="self-start">
            <Swords size={12} />
            Quête liée · {event.quest.status === 'DONE' ? 'terminée' : 'en cours'}
          </Badge>
        )}

        <Input
          label="Titre"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ex. : Séance de sport"
          autoFocus
        />
        <Textarea
          label="Description (facultatif)"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Détails, objectif du créneau…"
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Date"
            type="date"
            required
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
          <Input
            label="Début"
            type="time"
            required
            value={form.startTime}
            onChange={(e) => set('startTime', e.target.value)}
          />
          <Input
            label="Fin"
            type="time"
            required
            error={timeError ?? undefined}
            value={form.endTime}
            onChange={(e) => set('endTime', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Catégorie</span>
            <div className="flex items-center gap-2">
              <span
                className="size-3.5 shrink-0 rounded-full"
                style={{ background: selectedCategory?.color ?? 'var(--surface-3)' }}
                aria-hidden
              />
              <div className="flex-1">
                <Select
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                  disabled={categoriesQuery.isLoading}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <Select
            label="Priorité"
            value={form.priority}
            onChange={(e) => set('priority', e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>

        {/* Architecture prête : le rappel est enregistré, l'envoi réel arrivera plus tard. */}
        <Select
          label="Rappel"
          value={form.reminder}
          onChange={(e) => set('reminder', e.target.value)}
        >
          <option value="">Aucun rappel</option>
          {REMINDER_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m >= 60 ? `${m / 60} h avant` : `${m} min avant`}
            </option>
          ))}
        </Select>

        <Textarea
          label="Notes (facultatif)"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Matériel, liens, checklist…"
        />

        {event && !event.questId && (
          <div className="rounded-xl border border-line bg-surface-2 p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Swords size={14} className="text-accent" /> Transformer en quête
            </p>
            <p className="mt-1 text-xs text-muted">
              L'événement restera dans le Planning et sa complétion rapportera de l'XP.
            </p>
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Select
                  label="Difficulté"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]} · {XP_BY_DIFFICULTY[d]} XP
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                loading={convert.isPending}
                onClick={() => convert.mutate()}
              >
                Créer la quête
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error instanceof Error ? error.message : 'Erreur'}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {event ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              loading={remove.isPending}
              onClick={handleDelete}
            >
              <Trash2 size={15} /> Supprimer
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={save.isPending}>
              {event ? 'Enregistrer' : "Créer l'événement"}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        icon={Trash2}
        tone="danger"
        title={`Supprimer l'événement « ${event?.title ?? ''} » ?`}
        description={
          <>
            <p>Cet événement sera définitivement supprimé du Planning.</p>
            <p>Cette opération est irréversible.</p>
          </>
        }
        confirmLabel="Supprimer"
        loading={remove.isPending}
      />
    </Modal>
  )
}
