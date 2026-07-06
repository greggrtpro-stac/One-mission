import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'
import { cn } from '@/lib/cn'
import { addDays, isSameDay, startOfWeek } from './time'

const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTH_LABELS = Array.from({ length: 12 }, (_, m) =>
  new Date(2000, m, 1).toLocaleDateString('fr-FR', { month: 'long' }),
)

interface WeekPickerProps {
  open: boolean
  onClose: () => void
  /** Lundi de la semaine actuellement affichée dans le Planning. */
  weekStart: Date
  onSelectWeek: (weekStart: Date) => void
  /** Conteneur englobant déclencheur + popover : un clic en dehors ferme. */
  boundaryRef: RefObject<HTMLDivElement | null>
}

/** Mini-calendrier (type Google Agenda) pour sauter à n'importe quelle semaine. */
export function WeekPicker({ open, onClose, weekStart, onSelectWeek, boundaryRef }: WeekPickerProps) {
  const [view, setView] = useState({ year: weekStart.getFullYear(), month: weekStart.getMonth() })
  const [mode, setMode] = useState<'days' | 'months'>('days')

  // À chaque ouverture, se recaler sur le mois de la semaine affichée.
  useEffect(() => {
    if (!open) return
    setView({ year: weekStart.getFullYear(), month: weekStart.getMonth() })
    setMode('days')
  }, [open, weekStart])

  // Fermeture par clic extérieur ou Échap.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (boundaryRef.current && !boundaryRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, boundaryRef])

  function shiftMonth(delta: number) {
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const today = new Date()
  const gridStart = startOfWeek(new Date(view.year, view.month, 1))
  const weeks = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)),
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          role="dialog"
          aria-label="Choisir une semaine"
          className="absolute top-full left-0 z-40 mt-2 w-72 rounded-2xl border border-line bg-surface p-3 shadow-2xl"
        >
          {/* En-tête : mois précédent/suivant (ou année en vue « mois ») */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => (mode === 'days' ? shiftMonth(-1) : setView((v) => ({ ...v, year: v.year - 1 })))}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={mode === 'days' ? 'Mois précédent' : 'Année précédente'}
            >
              <ChevronLeft size={16} />
            </button>

            {mode === 'days' ? (
              <button
                onClick={() => setMode('months')}
                title="Choisir le mois et l'année"
                className="rounded-lg px-2.5 py-1 text-sm font-semibold capitalize transition-colors hover:bg-surface-2 hover:text-accent"
              >
                {MONTH_LABELS[view.month]} {view.year}
              </button>
            ) : (
              <span className="px-2.5 py-1 text-sm font-semibold tabular-nums">{view.year}</span>
            )}

            <button
              onClick={() => (mode === 'days' ? shiftMonth(1) : setView((v) => ({ ...v, year: v.year + 1 })))}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={mode === 'days' ? 'Mois suivant' : 'Année suivante'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {mode === 'days' ? (
            <div className="mt-2">
              <div className="grid grid-cols-7">
                {DAY_INITIALS.map((d, i) => (
                  <span key={i} className="py-1 text-center text-[10px] font-bold text-faint">
                    {d}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                {weeks.map((week) => {
                  const selected = week[0]!.getTime() === weekStart.getTime()
                  return (
                    <button
                      key={week[0]!.toISOString()}
                      onClick={() => onSelectWeek(week[0]!)}
                      title={`Semaine du ${week[0]!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                      className={cn(
                        'grid grid-cols-7 rounded-lg transition-colors',
                        selected ? 'bg-accent-soft' : 'hover:bg-surface-2',
                      )}
                    >
                      {week.map((day) => {
                        const isToday = isSameDay(day, today)
                        return (
                          <span
                            key={day.toISOString()}
                            className={cn(
                              'mx-auto flex size-8 items-center justify-center rounded-full text-xs tabular-nums',
                              day.getMonth() !== view.month ? 'text-faint' : 'text-ink',
                              selected && 'font-semibold text-accent',
                              isToday && 'bg-accent font-semibold text-on-accent',
                            )}
                          >
                            {day.getDate()}
                          </span>
                        )
                      })}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-3 gap-1">
              {MONTH_LABELS.map((label, m) => {
                const isViewMonth = m === view.month
                const isSelectedMonth =
                  weekStart.getFullYear() === view.year && weekStart.getMonth() === m
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setView((v) => ({ ...v, month: m }))
                      setMode('days')
                    }}
                    className={cn(
                      'rounded-lg px-2 py-2 text-xs font-medium capitalize transition-colors',
                      isSelectedMonth
                        ? 'bg-accent-soft text-accent'
                        : isViewMonth
                          ? 'bg-surface-2 text-ink'
                          : 'text-muted hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-2 flex justify-end border-t border-line pt-2">
            <button
              onClick={() => onSelectWeek(startOfWeek(new Date()))}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              Aujourd'hui
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
