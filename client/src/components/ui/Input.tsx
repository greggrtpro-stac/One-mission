import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: ReactNode
  /** Élément posé à droite dans le champ (ex. œil afficher/masquer). */
  trailing?: ReactNode
}

export function Input({ label, error, hint, trailing, className, id, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border bg-surface-2 px-3.5 text-sm text-ink',
            'placeholder:text-faint transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-transparent',
            error ? 'border-danger' : 'border-line',
            trailing && 'pr-10',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">{trailing}</div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  )
}
