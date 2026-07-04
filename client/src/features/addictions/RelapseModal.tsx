import type { AddictionDto } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { addictionsApi } from '@/api/deepwork'
import { Button, Modal, Textarea } from '@/components/ui'
import { streakDays } from './streak'

interface RelapseModalProps {
  addiction: AddictionDto | null
  onClose: () => void
}

/** Déclaration honnête d'une rechute : remet la série à zéro, garde l'historique. */
export function RelapseModal({ addiction, onClose }: RelapseModalProps) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  useEffect(() => {
    if (addiction) setNote('')
  }, [addiction])

  const mutation = useMutation({
    mutationFn: (a: AddictionDto) => addictionsApi.relapse(a.id, note.trim() || null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addictions'] })
      onClose()
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (addiction) mutation.mutate(addiction)
  }

  const days = addiction ? streakDays(addiction.startDate) : 0

  return (
    <Modal open={addiction !== null} onClose={onClose} title="Déclarer une rechute">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Une rechute n'efface pas le chemin parcouru : ta série de{' '}
          <span className="font-bold text-ink">
            {days} jour{days > 1 ? 's' : ''}
          </span>{' '}
          sera archivée et le compteur repartira de maintenant.
        </p>
        <Textarea
          label="Qu'est-ce qui a déclenché la rechute ? (facultatif)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Comprendre le déclencheur aide à tenir plus longtemps la prochaine fois."
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
          <Button type="submit" variant="danger" loading={mutation.isPending}>
            J'ai rechuté, on repart
          </Button>
        </div>
      </form>
    </Modal>
  )
}
