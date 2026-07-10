import type { RoutineTaskDto } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { routinesApi } from '@/api/routines'
import { Button, Input, Modal } from '@/components/ui'

interface RoutineTaskFormModalProps {
  open: boolean
  onClose: () => void
  /** Section cible — utilisée uniquement à la création. */
  sectionId: string
  /** Présent = modification d'une tâche existante. */
  task?: RoutineTaskDto
}

export function RoutineTaskFormModal({ open, onClose, sectionId, task }: RoutineTaskFormModalProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (open) setTitle(task?.title ?? '')
  }, [open, task])

  const mutation = useMutation({
    mutationFn: () =>
      task ? routinesApi.updateTask(task.id, title.trim()) : routinesApi.createTask(sectionId, title.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['routines'] })
      onClose()
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Modifier la tâche' : 'Nouvelle tâche'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Titre"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. : Méditation"
          autoFocus
        />
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
            {task ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
