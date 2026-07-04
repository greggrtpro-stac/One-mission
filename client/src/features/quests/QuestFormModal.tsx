import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  PRIORITY_LABELS,
  QUEST_CATEGORIES,
  DIFFICULTIES,
  PRIORITIES,
  XP_BY_DIFFICULTY,
  type QuestDto,
} from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { questsApi, type QuestPayload } from '@/api/quests'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { todayIso } from '@/lib/dates'

interface QuestFormModalProps {
  open: boolean
  onClose: () => void
  /** Quête à éditer, ou undefined pour une création. */
  quest?: QuestDto
}

const emptyForm = (): QuestPayload => ({
  title: '',
  description: '',
  category: 'AUTRE',
  priority: 'MEDIUM',
  difficulty: 'MEDIUM',
  dueDate: todayIso(),
  dueTime: '',
})

export function QuestFormModal({ open, onClose, quest }: QuestFormModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<QuestPayload>(emptyForm())

  useEffect(() => {
    if (!open) return
    setForm(
      quest
        ? {
            title: quest.title,
            description: quest.description ?? '',
            category: quest.category,
            priority: quest.priority,
            difficulty: quest.difficulty,
            dueDate: quest.dueDate,
            dueTime: quest.dueTime ?? '',
          }
        : emptyForm(),
    )
  }, [open, quest])

  const mutation = useMutation({
    mutationFn: () => {
      const payload: QuestPayload = {
        ...form,
        description: form.description?.trim() || null,
        dueTime: form.dueTime || null,
      }
      return quest ? questsApi.update(quest.id, payload) : questsApi.create(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quests'] })
      onClose()
    },
  })

  function set<K extends keyof QuestPayload>(key: K, value: QuestPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={quest ? 'Modifier la quête' : 'Nouvelle quête'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Titre"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ex. : Courir 5 km"
          autoFocus
        />
        <Textarea
          label="Description (facultatif)"
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Détails, contexte, critères de réussite…"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Catégorie"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          >
            {QUEST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
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

        <Select
          label="Difficulté"
          value={form.difficulty}
          onChange={(e) => set('difficulty', e.target.value)}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]} · {XP_BY_DIFFICULTY[d]} XP
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            required
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
          <Input
            label="Heure (facultatif)"
            type="time"
            value={form.dueTime ?? ''}
            onChange={(e) => set('dueTime', e.target.value)}
          />
        </div>

        {mutation.error && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {mutation.error instanceof Error ? mutation.error.message : 'Erreur'}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {quest ? 'Enregistrer' : 'Créer la quête'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
