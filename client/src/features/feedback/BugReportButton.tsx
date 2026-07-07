import type { FeedbackCategory, FeedbackPriority } from '@one-mission/shared'
import { useMutation } from '@tanstack/react-query'
import { Bug, ImagePlus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { sendFeedback } from '@/api/feedback'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'BUG', label: 'Bug' },
  { id: 'SUGGESTION', label: 'Suggestion' },
  { id: 'UI', label: 'Interface' },
  { id: 'PERFORMANCE', label: 'Performance' },
  { id: 'OTHER', label: 'Autre' },
]

const PRIORITIES: { id: FeedbackPriority; label: string }[] = [
  { id: 'LOW', label: 'Basse — détail, rien de bloquant' },
  { id: 'MEDIUM', label: 'Moyenne — gênant mais contournable' },
  { id: 'HIGH', label: 'Haute — fonctionnalité inutilisable' },
  { id: 'CRITICAL', label: 'Critique — bloque toute l’application' },
]

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'BUG' as FeedbackCategory,
  priority: 'MEDIUM' as FeedbackPriority,
}

/** Compresse la capture en JPEG ≤ 1280 px pour rester sous la limite d'envoi. */
async function fileToScreenshotDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

/**
 * Bouton « Signaler un bug » (en-tête de l'application) + formulaire.
 * Les signalements sont enregistrés en base (table Feedback), avec la route
 * courante pour aider au diagnostic.
 */
export function BugReportButton() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [screenshotError, setScreenshotError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () =>
      sendFeedback({ ...form, page: location.pathname, screenshot: screenshot ?? undefined }),
  })

  function close() {
    setOpen(false)
    // Après un envoi réussi, le prochain signalement repart d'un formulaire vierge.
    if (send.isSuccess) {
      setForm(EMPTY_FORM)
      setScreenshot(null)
      send.reset()
    }
  }

  async function handleScreenshot(file: File | undefined) {
    setScreenshotError(null)
    if (!file) return
    try {
      setScreenshot(await fileToScreenshotDataUrl(file))
    } catch {
      setScreenshotError("Impossible de lire cette image — essaie un PNG ou un JPEG.")
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send.mutate()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Signaler un bug"
        aria-label="Signaler un bug"
        className="flex items-center gap-1.5 rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Bug size={18} />
        <span className="hidden text-sm font-medium md:inline">Signaler un bug</span>
      </button>

      <Modal open={open} onClose={close} title="Signaler un bug">
        {send.isSuccess ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-success-soft px-4 py-3.5 text-sm text-success">
              Merci ! Ton signalement a bien été enregistré — il aide directement à améliorer One
              Mission.
            </p>
            <div className="flex justify-end">
              <Button onClick={close}>Fermer</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Titre du problème"
              required
              minLength={3}
              maxLength={120}
              placeholder="Ex. : le bouton Enregistrer ne répond pas"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              label="Description"
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              placeholder="Ce que tu faisais, ce qui s'est passé, ce que tu attendais…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Catégorie"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as FeedbackCategory }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Priorité"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as FeedbackPriority }))
                }
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <span className="text-sm font-medium text-ink">Capture d'écran (optionnelle)</span>
              {screenshot ? (
                <div className="relative mt-2 w-fit">
                  <img
                    src={screenshot}
                    alt="Capture d'écran jointe"
                    className="max-h-40 rounded-xl border border-line"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    aria-label="Retirer la capture d'écran"
                    className="absolute -top-2 -right-2 rounded-full border border-line bg-surface p-1 text-muted hover:text-danger"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-2.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
                  <ImagePlus size={16} />
                  Joindre une image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void handleScreenshot(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
              {screenshotError && <p className="mt-1.5 text-xs text-danger">{screenshotError}</p>}
            </div>

            {send.error && (
              <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {send.error instanceof Error ? send.error.message : "Envoi impossible pour l'instant"}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={close}>
                Annuler
              </Button>
              <Button type="submit" loading={send.isPending}>
                Envoyer le signalement
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
