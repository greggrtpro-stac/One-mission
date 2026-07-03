import { motion } from 'framer-motion'
import { Card, LogoMark } from '@/components/ui'

/** Page temporaire pour les modules pas encore développés. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <Card className="mt-6 flex flex-col items-center gap-4 p-12 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          className="text-faint"
        >
          <LogoMark size={56} />
        </motion.div>
        <p className="font-medium">Cette section arrive très bientôt</p>
        <p className="text-sm text-muted">
          Le module « {title} » est en cours de construction.
        </p>
      </Card>
    </div>
  )
}
