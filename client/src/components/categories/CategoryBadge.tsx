import { cn } from '@/lib/cn'

interface CategoryBadgeProps {
  category: { name: string; color: string; icon: string }
  className?: string
}

/**
 * Pastille de catégorie personnalisée (emoji + nom, teintée de la couleur de
 * la catégorie) — même langage visuel que les événements du Planning
 * (color-mix pour un fond doux qui marche en clair comme en sombre).
 */
export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        className,
      )}
      style={{
        color: category.color,
        background: `color-mix(in srgb, ${category.color} 14%, transparent)`,
      }}
    >
      <span aria-hidden>{category.icon}</span>
      {category.name}
    </span>
  )
}
