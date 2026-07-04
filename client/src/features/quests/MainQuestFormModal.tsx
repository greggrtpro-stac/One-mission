import type { MainQuestDto, MainQuestMilestone } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { mainQuestApi } from '@/api/quests'
import { Button, Input, Modal, Textarea } from '@/components/ui'

interface MainQuestFormModalProps {
  open: boolean
  onClose: () => void
  mainQuest?: MainQuestDto | null
}

export function MainQuestFormModal({ open, onClose, mainQuest }: MainQuestFormModalProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [milestones, setMilestones] = useState<MainQuestMilestone[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(mainQuest?.title ?? '')
    setDescription(mainQuest?.description ?? '')
    setTargetDate(mainQuest?.targetDate ?? '')
    setMilestones(mainQuest?.milestones ?? [])
  }, [open, mainQuest])

  const mutation = useMutation({
    mutationFn: () => {
      const cleaned = milestones.filter((m) => m.title.trim().length > 0)
      const doneCount = cleaned.filter((m) => m.done).length
      const progress =
        cleaned.length > 0
          ? Math.round((doneCount / cleaned.length) * 100)
          : (mainQuest?.progress ?? 0)
      return mainQuestApi.upsert({
        title,
        description: description.trim() || null,
        targetDate: targetDate || null,
        progress,
        milestones: cleaned,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['main-quest'] })
      onClose()
    },
  })

  function addMilestone() {
    setMilestones((ms) => [...ms, { id: crypto.randomUUID(), title: '', done: false }])
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mainQuest ? 'Modifier la quête principale' : 'Définir ta quête principale'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Objectif principal"
          required
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. : Lancer mon entreprise"
          autoFocus
        />
        <Textarea
          label="Description (facultatif)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Pourquoi cet objectif compte, à quoi ressemble la réussite…"
        />
        <Input
          label="Date cible (facultatif)"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />

        <div>
          <p className="text-sm font-medium">Jalons</p>
          <p className="mt-0.5 text-xs text-faint">
            Découpe ta mission en étapes : la progression se calcule automatiquement.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {milestones.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <Input
                  value={m.title}
                  maxLength={160}
                  placeholder={`Jalon ${i + 1}`}
                  onChange={(e) =>
                    setMilestones((ms) =>
                      ms.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)),
                    )
                  }
                  className="flex-1"
                />
                <button
                  type="button"
                  aria-label="Supprimer le jalon"
                  onClick={() => setMilestones((ms) => ms.filter((x) => x.id !== m.id))}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {milestones.length < 20 && (
              <Button type="button" variant="secondary" size="sm" onClick={addMilestone} className="w-fit">
                <Plus size={14} /> Ajouter un jalon
              </Button>
            )}
          </div>
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
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
