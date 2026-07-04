import { cn } from '@/lib/cn'

interface TimerRingProps {
  /** Progression 0 → 1 de la phase en cours. */
  progress: number
  timeLabel: string
  phaseLabel: string
  isBreak: boolean
}

const SIZE = 280
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Anneau de progression du timer DeepWork. */
export function TimerRing({ progress, timeLabel, phaseLabel, isBreak }: TimerRingProps) {
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={isBreak ? 'var(--success)' : 'var(--accent)'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          style={{
            transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease',
            filter: isBreak ? undefined : 'drop-shadow(0 0 10px var(--accent-glow))',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className={cn(
            'text-xs font-bold tracking-[0.25em] uppercase',
            isBreak ? 'text-success' : 'text-accent',
          )}
        >
          {phaseLabel}
        </p>
        <p className="mt-1 font-mono text-6xl font-bold tracking-tight tabular-nums">{timeLabel}</p>
      </div>
    </div>
  )
}
