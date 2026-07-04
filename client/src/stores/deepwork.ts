import { DEFAULT_DEEPWORK_SETTINGS, type DeepWorkSettings } from '@one-mission/shared'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Phase = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface SessionRecord {
  startedAt: string
  duration: number
  kind: Phase
  completed: boolean
}

interface DeepWorkState {
  phase: Phase
  status: TimerStatus
  /** Timestamp (ms) de fin quand le timer tourne — insensible aux onglets inactifs. */
  endsAt: number | null
  /** Ms restantes quand le timer est en pause ou à l'arrêt. */
  remainingMs: number
  /** Timestamp de début de la phase en cours (pour l'enregistrement). */
  phaseStartedAt: number | null
  /** Sessions de focus terminées dans le cycle courant. */
  cycle: number
  settings: DeepWorkSettings

  applySettings: (s: DeepWorkSettings) => void
  start: () => void
  pause: () => void
  reset: () => void
  /** Termine la phase (timer à zéro) : renvoie la session à enregistrer. */
  completePhase: () => SessionRecord | null
  /** Saute la phase en cours : renvoie une session partielle si pertinent. */
  skipPhase: () => SessionRecord | null
}

export function phaseDurationMs(phase: Phase, s: DeepWorkSettings): number {
  const minutes =
    phase === 'FOCUS'
      ? s.focusMinutes
      : phase === 'SHORT_BREAK'
        ? s.shortBreakMinutes
        : s.longBreakMinutes
  return minutes * 60_000
}

export const PHASE_LABELS: Record<Phase, string> = {
  FOCUS: 'Focus',
  SHORT_BREAK: 'Pause courte',
  LONG_BREAK: 'Pause longue',
}

export const useDeepWorkStore = create<DeepWorkState>()(
  persist(
    (set, get) => ({
      phase: 'FOCUS',
      status: 'idle',
      endsAt: null,
      remainingMs: phaseDurationMs('FOCUS', DEFAULT_DEEPWORK_SETTINGS),
      phaseStartedAt: null,
      cycle: 0,
      settings: DEFAULT_DEEPWORK_SETTINGS,

      applySettings: (settings) => {
        const { status, phase } = get()
        set({
          settings,
          // À l'arrêt, la durée affichée suit les nouveaux réglages.
          ...(status === 'idle' ? { remainingMs: phaseDurationMs(phase, settings) } : {}),
        })
      },

      start: () => {
        const { status, remainingMs, phase, settings } = get()
        if (status === 'running') return
        const duration = status === 'paused' ? remainingMs : phaseDurationMs(phase, settings)
        set({
          status: 'running',
          endsAt: Date.now() + duration,
          phaseStartedAt: get().phaseStartedAt ?? Date.now(),
        })
      },

      pause: () => {
        const { status, endsAt } = get()
        if (status !== 'running' || !endsAt) return
        set({ status: 'paused', remainingMs: Math.max(0, endsAt - Date.now()), endsAt: null })
      },

      reset: () => {
        const { phase, settings } = get()
        set({
          status: 'idle',
          endsAt: null,
          remainingMs: phaseDurationMs(phase, settings),
          phaseStartedAt: null,
        })
      },

      completePhase: () => {
        const { phase, settings, cycle, phaseStartedAt } = get()
        const planned = phaseDurationMs(phase, settings)
        const record: SessionRecord = {
          startedAt: new Date(phaseStartedAt ?? Date.now() - planned).toISOString(),
          duration: Math.round(planned / 1000),
          kind: phase,
          completed: true,
        }

        if (phase === 'FOCUS') {
          const nextCycle = cycle + 1
          const nextPhase: Phase =
            nextCycle % settings.cyclesBeforeLongBreak === 0 ? 'LONG_BREAK' : 'SHORT_BREAK'
          // Les pauses démarrent automatiquement.
          set({
            phase: nextPhase,
            cycle: nextCycle,
            status: 'running',
            endsAt: Date.now() + phaseDurationMs(nextPhase, settings),
            phaseStartedAt: Date.now(),
          })
        } else {
          // Retour au focus : on attend que le joueur lance la session.
          set({
            phase: 'FOCUS',
            status: 'idle',
            endsAt: null,
            remainingMs: phaseDurationMs('FOCUS', settings),
            phaseStartedAt: null,
          })
        }
        return record
      },

      skipPhase: () => {
        const { phase, settings, status, endsAt, remainingMs, phaseStartedAt, cycle } = get()
        const planned = phaseDurationMs(phase, settings)
        const left = status === 'running' && endsAt ? endsAt - Date.now() : remainingMs
        const elapsedSec = Math.round((planned - left) / 1000)

        // Un focus interrompu d'au moins 1 min compte dans l'historique (non complété).
        const record: SessionRecord | null =
          phase === 'FOCUS' && elapsedSec >= 60
            ? {
                startedAt: new Date(phaseStartedAt ?? Date.now() - elapsedSec * 1000).toISOString(),
                duration: elapsedSec,
                kind: 'FOCUS',
                completed: false,
              }
            : null

        if (phase === 'FOCUS') {
          const nextPhase: Phase =
            (cycle + 1) % settings.cyclesBeforeLongBreak === 0 ? 'LONG_BREAK' : 'SHORT_BREAK'
          set({
            phase: nextPhase,
            status: 'idle',
            endsAt: null,
            remainingMs: phaseDurationMs(nextPhase, settings),
            phaseStartedAt: null,
          })
        } else {
          set({
            phase: 'FOCUS',
            status: 'idle',
            endsAt: null,
            remainingMs: phaseDurationMs('FOCUS', settings),
            phaseStartedAt: null,
          })
        }
        return record
      },
    }),
    { name: 'om-deepwork' },
  ),
)
