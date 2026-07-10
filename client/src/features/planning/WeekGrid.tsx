import type { PlanningEventDto } from '@one-mission/shared'
import { Check, Swords } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import {
  MINUTES_PER_DAY,
  addDays,
  addMinutes,
  formatEventRange,
  isSameDay,
  minutesOfDay,
  weekDays,
} from './time'

const SNAP_MINUTES = 30
const HOURS = Array.from({ length: 24 }, (_, h) => h)

interface WeekGridProps {
  weekStart: Date
  events: PlanningEventDto[]
  /** Hauteur d'une heure en pixels (zoom 30 min / 60 min). */
  hourHeight: number
  /** Matérialise les demi-heures dans la grille. */
  showHalfHours: boolean
  onCreateSlot: (start: Date, end: Date) => void
  onEventClick: (event: PlanningEventDto) => void
  onEventMove: (event: PlanningEventDto, start: Date, end: Date) => void
  onToggleDone: (event: PlanningEventDto) => void
}

/** Portion d'un événement affichée sur un jour donné (les événements restent sur un jour). */
interface Segment {
  event: PlanningEventDto
  start: Date
  end: Date
  startMin: number
  endMin: number
}

interface Positioned extends Segment {
  col: number
  cols: number
}

/** Répartit les segments qui se chevauchent en colonnes (rendu type Google Agenda). */
function layoutDay(segments: Segment[]): Positioned[] {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)
  const result: Positioned[] = []

  let cluster: { items: { seg: Segment; col: number }[]; colEnds: number[]; maxEnd: number } | null =
    null

  const flush = () => {
    if (!cluster) return
    for (const { seg, col } of cluster.items) {
      result.push({ ...seg, col, cols: cluster.colEnds.length })
    }
    cluster = null
  }

  for (const seg of sorted) {
    if (!cluster || seg.startMin >= cluster.maxEnd) {
      flush()
      cluster = { items: [], colEnds: [], maxEnd: 0 }
    }
    let col = cluster.colEnds.findIndex((end) => end <= seg.startMin)
    if (col === -1) {
      col = cluster.colEnds.length
      cluster.colEnds.push(seg.endMin)
    } else {
      cluster.colEnds[col] = seg.endMin
    }
    cluster.items.push({ seg, col })
    cluster.maxEnd = Math.max(cluster.maxEnd, seg.endMin)
  }
  flush()

  return result
}

interface DragState {
  event: PlanningEventDto
  mode: 'move' | 'resize'
  startX: number
  startY: number
  originStart: Date
  originEnd: Date
  moved: boolean
  /** Dernière position calculée — source de vérité au pointerup (l'état React peut être en retard d'une frame). */
  preview: { start: Date; end: Date } | null
}

export function WeekGrid({
  weekStart,
  events,
  hourHeight,
  showHalfHours,
  onCreateSlot,
  onEventClick,
  onEventMove,
  onToggleDone,
}: WeekGridProps) {
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const scrollRef = useRef<HTMLDivElement>(null)
  const columnRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  // Un vrai déplacement génère aussi un « click » sur la colonne : on l'avale
  // pour ne pas ouvrir la modale de création juste après un drag.
  const suppressClickRef = useRef(false)
  const [preview, setPreview] = useState<{ id: string; start: Date; end: Date } | null>(null)
  const [now, setNow] = useState(() => new Date())

  const dayHeight = 24 * hourHeight

  // Ligne « maintenant » rafraîchie chaque minute.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // Au montage, se positionner sur le début de matinée plutôt que sur minuit.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 7 * hourHeight })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const segmentsByDay = useMemo(() => {
    const byDay: Segment[][] = days.map(() => [])
    for (const event of events) {
      const isPreviewed = preview?.id === event.id
      const start = isPreviewed ? preview.start : new Date(event.startAt)
      const end = isPreviewed ? preview.end : new Date(event.endAt)

      days.forEach((day, i) => {
        const dayStart = day
        const dayEnd = addDays(day, 1)
        if (end <= dayStart || start >= dayEnd) return
        const segStart = start < dayStart ? dayStart : start
        const segEnd = end > dayEnd ? dayEnd : end
        byDay[i]!.push({
          event,
          start,
          end,
          startMin: isSameDay(segStart, day) ? minutesOfDay(segStart) : 0,
          endMin: segEnd.getTime() >= dayEnd.getTime() ? MINUTES_PER_DAY : minutesOfDay(segEnd),
        })
      })
    }
    return byDay.map(layoutDay)
  }, [days, events, preview])

  function snapMinutes(value: number): number {
    return Math.round(value / SNAP_MINUTES) * SNAP_MINUTES
  }

  function handleColumnClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    if (suppressClickRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const minutes = Math.floor(((e.clientY - rect.top) / hourHeight) * 60)
    const startMin = Math.min(
      Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES,
      MINUTES_PER_DAY - 60,
    )
    onCreateSlot(addMinutes(day, startMin), addMinutes(day, startMin + 60))
  }

  // Le suivi du drag est accroché à window : la puce peut être re-rendue dans
  // une autre colonne pendant le déplacement (l'élément d'origine disparaît),
  // les événements pointer doivent donc survivre à ce remontage.
  function beginDrag(
    e: React.PointerEvent<HTMLElement>,
    event: PlanningEventDto,
    mode: DragState['mode'],
  ) {
    e.stopPropagation()
    dragRef.current = {
      event,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      originStart: new Date(event.startAt),
      originEnd: new Date(event.endAt),
      moved: false,
      preview: null,
    }

    const onMove = (ev: PointerEvent) => updateDrag(ev.clientX, ev.clientY)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      endDrag()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function updateDrag(clientX: number, clientY: number) {
    const drag = dragRef.current
    if (!drag) return

    const dx = clientX - drag.startX
    const dy = clientY - drag.startY
    if (!drag.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    drag.moved = true

    const deltaMin = snapMinutes((dy / hourHeight) * 60)

    if (drag.mode === 'resize') {
      const startMin = minutesOfDay(drag.originStart)
      const duration = Math.round((drag.originEnd.getTime() - drag.originStart.getTime()) / 60000)
      const newDuration = Math.min(
        Math.max(duration + deltaMin, SNAP_MINUTES),
        MINUTES_PER_DAY - startMin,
      )
      drag.preview = { start: drag.originStart, end: addMinutes(drag.originStart, newDuration) }
      setPreview({ id: drag.event.id, ...drag.preview })
      return
    }

    // Déplacement : delta vertical = minutes, delta horizontal = jours.
    const colWidth = columnRef.current?.getBoundingClientRect().width ?? 0
    const deltaDays = colWidth > 0 ? Math.round(dx / colWidth) : 0

    const originDayIndex = Math.round(
      (new Date(
        drag.originStart.getFullYear(),
        drag.originStart.getMonth(),
        drag.originStart.getDate(),
      ).getTime() -
        weekStart.getTime()) /
        86_400_000,
    )
    const dayIndex = Math.min(Math.max(originDayIndex + deltaDays, 0), 6)

    const duration = Math.round((drag.originEnd.getTime() - drag.originStart.getTime()) / 60000)
    const clampedDuration = Math.min(duration, MINUTES_PER_DAY)
    const startMin = Math.min(
      Math.max(minutesOfDay(drag.originStart) + deltaMin, 0),
      MINUTES_PER_DAY - clampedDuration,
    )

    const start = addMinutes(days[dayIndex]!, startMin)
    drag.preview = { start, end: addMinutes(start, clampedDuration) }
    setPreview({ id: drag.event.id, ...drag.preview })
  }

  function endDrag() {
    const drag = dragRef.current
    dragRef.current = null

    if (!drag) return
    if (drag.moved && drag.preview) {
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      onEventMove(drag.event, drag.preview.start, drag.preview.end)
    } else if (!drag.moved) {
      onEventClick(drag.event)
    }
    setPreview(null)
  }

  const nowOffset = (minutesOfDay(now) / 60) * hourHeight

  return (
    <div
      ref={scrollRef}
      className="relative flex-1 overflow-auto overscroll-contain rounded-2xl border border-line bg-surface"
    >
      <div className="min-w-[640px]">
        {/* En-tête des jours */}
        <div className="sticky top-0 z-20 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-line bg-surface/95 backdrop-blur-sm">
          <div />
          {days.map((day) => {
            const today = isSameDay(day, now)
            return (
              <div
                key={day.toISOString()}
                className="flex flex-col items-center gap-0.5 border-l border-line py-2"
              >
                <span className="text-[11px] font-medium text-muted capitalize">
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </span>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                    today ? 'bg-accent text-on-accent' : 'text-ink',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Corps : gouttière horaire + 7 colonnes */}
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div className="relative" style={{ height: dayHeight }}>
            {HOURS.map((h) => (
              <span
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] font-medium text-faint tabular-nums"
                style={{ top: h * hourHeight }}
              >
                {h > 0 && `${String(h).padStart(2, '0')}h00`}
              </span>
            ))}
          </div>

          {days.map((day, dayIndex) => (
            <div
              key={day.toISOString()}
              ref={dayIndex === 0 ? columnRef : undefined}
              className="relative cursor-crosshair border-l border-line"
              style={{ height: dayHeight }}
              onClick={(e) => handleColumnClick(day, e)}
            >
              {HOURS.map((h) => (
                <div key={h}>
                  {h > 0 && (
                    <div
                      className="pointer-events-none absolute inset-x-0 border-t border-line/70"
                      style={{ top: h * hourHeight }}
                    />
                  )}
                  {showHalfHours && (
                    <div
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/45"
                      style={{ top: h * hourHeight + hourHeight / 2 }}
                    />
                  )}
                </div>
              ))}

              {isSameDay(day, now) && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10"
                  style={{ top: nowOffset }}
                >
                  <div className="h-px bg-danger" />
                  <div className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-danger" />
                </div>
              )}

              {segmentsByDay[dayIndex]!.map((seg) => (
                <EventChip
                  key={seg.event.id}
                  segment={seg}
                  hourHeight={hourHeight}
                  dragging={preview?.id === seg.event.id}
                  onPointerDown={(e, mode) => beginDrag(e, seg.event, mode)}
                  onToggleDone={() => onToggleDone(seg.event)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface EventChipProps {
  segment: Positioned
  hourHeight: number
  dragging: boolean
  onPointerDown: (e: React.PointerEvent<HTMLElement>, mode: 'move' | 'resize') => void
  onToggleDone: () => void
}

function EventChip({ segment, hourHeight, dragging, onPointerDown, onToggleDone }: EventChipProps) {
  const { event, col, cols, startMin, endMin } = segment
  const top = (startMin / 60) * hourHeight
  const height = Math.max(((endMin - startMin) / 60) * hourHeight, 18)
  const width = 100 / cols
  const done = event.status === 'DONE'
  const cancelled = event.status === 'CANCELLED'
  const compact = height < 44

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group absolute z-[5] flex touch-none flex-col overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1',
        'cursor-grab text-left select-none active:cursor-grabbing',
        dragging && 'z-30 opacity-90 shadow-lg',
        cancelled && 'border-dashed opacity-50',
      )}
      style={{
        top,
        height,
        left: `calc(${col * width}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        borderLeftColor: event.category.color,
        background: `color-mix(in srgb, ${event.category.color} 16%, transparent)`,
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => onPointerDown(e, 'move')}
    >
      <div className="flex min-w-0 items-start justify-between gap-1">
        <p
          className={cn(
            'truncate text-xs leading-tight font-semibold text-ink',
            done && 'line-through opacity-70',
          )}
        >
          {event.questId && <Swords size={10} className="mr-1 inline-block align-[-1px]" />}
          <span className="mr-1">{event.category.icon}</span>
          {event.title}
        </p>
        {!cancelled && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onToggleDone()
            }}
            title={done ? 'Repasser en planifié' : 'Marquer comme effectué'}
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
              done
                ? 'text-white'
                : 'border-line-strong text-transparent opacity-0 group-hover:opacity-100 hover:text-muted',
            )}
            style={
              done
                ? { background: event.category.color, borderColor: event.category.color }
                : undefined
            }
          >
            <Check size={10} strokeWidth={3} />
          </button>
        )}
      </div>
      {!compact && (
        <p className="mt-0.5 truncate text-[10px] text-muted tabular-nums">
          {formatEventRange(segment.start, segment.end)}
        </p>
      )}

      {/* Poignée de redimensionnement (durée) */}
      <div
        className="absolute inset-x-1 bottom-0 h-1.5 cursor-ns-resize rounded-full opacity-0 transition-opacity group-hover:opacity-60"
        style={{ background: event.category.color }}
        onPointerDown={(e) => onPointerDown(e, 'resize')}
      />
    </div>
  )
}
