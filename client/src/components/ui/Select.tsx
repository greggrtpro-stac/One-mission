import type { SelectHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, className, id, children, ...props }: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'h-10 w-full cursor-pointer rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink',
          'transition-colors focus:border-transparent focus:ring-2 focus:ring-accent/60 focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
