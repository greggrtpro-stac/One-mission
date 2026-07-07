import type { FeedbackPayload } from '@one-mission/shared'
import { http } from './http'

/** Envoie un signalement de bêta-testeur (bouton « Signaler un bug »). */
export function sendFeedback(payload: FeedbackPayload) {
  return http.post<{ feedback: { id: string; createdAt: string } }>('/api/feedback', payload)
}
