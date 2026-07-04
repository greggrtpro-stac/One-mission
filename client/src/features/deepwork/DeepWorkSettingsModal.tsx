import type { DeepWorkSettings } from '@one-mission/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { deepworkApi } from '@/api/deepwork'
import { Button, Input, Modal } from '@/components/ui'
import { useDeepWorkStore } from '@/stores/deepwork'

interface DeepWorkSettingsModalProps {
  open: boolean
  onClose: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function DeepWorkSettingsModal({ open, onClose }: DeepWorkSettingsModalProps) {
  const queryClient = useQueryClient()
  const settings = useDeepWorkStore((s) => s.settings)
  const applySettings = useDeepWorkStore((s) => s.applySettings)
  const [form, setForm] = useState<DeepWorkSettings>(settings)

  useEffect(() => {
    if (open) setForm(settings)
  }, [open, settings])

  const mutation = useMutation({
    mutationFn: () => {
      const payload: DeepWorkSettings = {
        focusMinutes: clamp(form.focusMinutes, 5, 180),
        shortBreakMinutes: clamp(form.shortBreakMinutes, 1, 60),
        longBreakMinutes: clamp(form.longBreakMinutes, 5, 120),
        cyclesBeforeLongBreak: clamp(form.cyclesBeforeLongBreak, 2, 12),
      }
      return deepworkApi.saveSettings(payload)
    },
    onSuccess: (result) => {
      applySettings(result.settings)
      void queryClient.invalidateQueries({ queryKey: ['deepwork'] })
      onClose()
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  function numberField(key: keyof DeepWorkSettings) {
    return {
      type: 'number' as const,
      required: true,
      value: Number.isNaN(form[key]) ? '' : form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.valueAsNumber })),
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Réglages DeepWork">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Focus (min)" min={5} max={180} {...numberField('focusMinutes')} />
          <Input label="Pause courte (min)" min={1} max={60} {...numberField('shortBreakMinutes')} />
          <Input label="Pause longue (min)" min={5} max={120} {...numberField('longBreakMinutes')} />
          <Input
            label="Focus avant pause longue"
            min={2}
            max={12}
            {...numberField('cyclesBeforeLongBreak')}
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
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
