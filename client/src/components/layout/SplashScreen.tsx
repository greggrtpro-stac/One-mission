import { motion } from 'framer-motion'
import { LogoMark } from '@/components/ui'

/** Écran d'attente pendant la restauration de session. */
export function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="text-ink"
      >
        <LogoMark size={64} />
      </motion.div>
    </div>
  )
}
