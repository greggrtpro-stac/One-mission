import { cn } from '@/lib/cn'

interface LogoMarkProps {
  size?: number
  className?: string
}

/**
 * Emblème One Mission : un anneau de progression (blanc) dont la tête est
 * violette, convergeant vers le point central — la mission.
 * L'anneau hérite de `currentColor` : blanc sur fond sombre, noir sur fond clair.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <circle
        cx="24"
        cy="24"
        r="17"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="70 36.8"
        transform="rotate(-90 24 24)"
      />
      <circle
        cx="24"
        cy="24"
        r="17"
        stroke="var(--accent, #8b5cf6)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="17 89.8"
        transform="rotate(66 24 24)"
      />
      <circle cx="24" cy="24" r="5" fill="var(--accent, #8b5cf6)" />
    </svg>
  )
}

interface LogoProps {
  size?: number
  className?: string
  withText?: boolean
}

/** Logo complet : emblème + nom de la marque. */
export function Logo({ size = 30, withText = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <LogoMark size={size} />
      {withText && (
        <span
          className="font-semibold tracking-tight whitespace-nowrap"
          style={{ fontSize: size * 0.62 }}
        >
          One Mission<span className="text-accent">.</span>
        </span>
      )}
    </span>
  )
}
