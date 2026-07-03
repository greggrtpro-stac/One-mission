import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'accent' | 'neutral' | 'success' | 'danger' | 'warning' | 'outline'

const variants: Record<Variant, string> = {
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-surface-2 text-muted',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  outline: 'border border-line text-muted',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
