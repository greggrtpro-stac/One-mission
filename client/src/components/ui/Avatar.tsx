import { cn } from '@/lib/cn'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
}

/** Photo de profil, ou initiales sur fond orange doux à défaut. */
export function Avatar({ src, name, size = 36, className }: AvatarProps) {
  const initials = name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-accent-soft font-semibold text-accent select-none',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? <img src={src} alt={name} className="size-full object-cover" /> : initials || '?'}
    </span>
  )
}
