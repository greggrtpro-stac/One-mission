import type { TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const autoId = useId()
  const areaId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        className={cn(
          'min-h-24 w-full resize-y rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink',
          'placeholder:text-faint transition-colors',
          'focus:border-transparent focus:ring-2 focus:ring-accent/60 focus:outline-none',
          className,
        )}
        {...props}
      />
    </div>
  )
}
