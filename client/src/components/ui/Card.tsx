import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLMotionProps<'div'> {
  /** Légère élévation au survol (cartes cliquables, listes). */
  hoverable?: boolean
}

export function Card({ hoverable = false, className, children, ...props }: CardProps) {
  return (
    <motion.div
      className={cn(
        'rounded-2xl border border-line bg-surface',
        hoverable &&
          'transition-all duration-200 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
