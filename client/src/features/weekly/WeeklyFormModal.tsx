import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  XP_BY_DIFFICULTY,
  type WeeklyQuestDto,
} from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { weeklyApi, type WeeklyPayload } from '@/api/weekly'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'

interface WeeklyFormModalProps {
  open: boolean
  onClose: () => void
  weeklyQuest?: WeeklyQuestDto
}

export function WeeklyFormModal({ open, onClose, weeklyQuest }: WeeklyFormModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<WeeklyPayload>({ title: '', description: '', difficulty: 'MEDIUM' })

  useEffect(() => {
    if (!open) return
    setForm({
      title: weeklyQuest?.title ?? '',
      description: weeklyQuest?.description ?? '',
      difficulty: weeklyQuest?.difficulty ?? 'MEDIUM',
    })
  }, [open, weeklyQuest])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, description: form.description?.trim() || null }
      return weeklyQuest ? weeklyApi.update(weeklyQuest.id, payload) : weeklyApi.create(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weekly-quests'] })
      onClose()
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={weeklyQuest ? 'Modifier la quête hebdo' : 'Nouvelle quête hebdomadaire'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Titre"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ex. : 3 séances de sport"
          autoFocus
        />
        <Textarea
          label="Description (facultatif)"
          value={form.description ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Détails, règles du jeu…"
        />
        <Select
          label="Difficulté"
          value={form.difficulty}
          onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]} · {XP_BY_DIFFICULTY[d]} XP
            </option>
          ))}
        </Select>

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
            {weeklyQuest ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
