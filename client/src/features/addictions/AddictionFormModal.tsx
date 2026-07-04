import type { AddictionDto } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { addictionsApi } from '@/api/deepwork'
import { Button, Input, Modal } from '@/components/ui'
import { todayIso } from '@/lib/dates'

interface AddictionFormModalProps {
  open: boolean
  onClose: () => void
  addiction?: AddictionDto
}

export function AddictionFormModal({ open, onClose, addiction }: AddictionFormModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', icon: '', startDate: todayIso() })

  useEffect(() => {
    if (!open) return
    setForm({
      name: addiction?.name ?? '',
      icon: addiction?.icon ?? '',
      startDate: addiction ? addiction.startDate.slice(0, 10) : todayIso(),
    })
  }, [open, addiction])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        icon: form.icon.trim() || null,
        startDate: form.startDate,
      }
      return addiction ? addictionsApi.update(addiction.id, payload) : addictionsApi.create(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addictions'] })
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
      title={addiction ? "Modifier l'addiction" : 'Nouvelle addiction à vaincre'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nom"
          required
          maxLength={60}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ex. : Réseaux sociaux, cigarette…"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Emoji (facultatif)"
            maxLength={16}
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder="🚭"
          />
          <Input
            label="Abstinent depuis le"
            type="date"
            required
            max={todayIso()}
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
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
            {addiction ? 'Enregistrer' : 'Commencer le combat'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
