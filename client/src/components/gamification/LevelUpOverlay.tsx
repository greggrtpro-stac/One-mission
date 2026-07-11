import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { Button, LogoMark } from '@/components/ui'
import { useXpFxStore } from '@/stores/xpFx'

interface Particle {
  x: number
  y: number
  scale: number
  delay: number
}

/** Célébration plein écran de montée de niveau. */
export function LevelUpOverlay() {
  const levelUp = useXpFxStore((s) => s.levelUp)
  const clear = useXpFxStore((s) => s.clearLevelUp)

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: Math.cos((i / 18) * Math.PI * 2) * (90 + Math.random() * 70),
        y: Math.sin((i / 18) * Math.PI * 2) * (90 + Math.random() * 70),
        scale: 0.5 + Math.random() * 0.9,
        delay: Math.random() * 0.25,
      })),
    // Régénère les particules à chaque célébration
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelUp],
  )

  return (
    <AnimatePresence>
      {levelUp !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={clear}
        >
          <div className="relative flex flex-col items-center px-6 text-center" onClick={(e) => e.stopPropagation()}>
            {/* Particules violettes */}
            {particles.map((p, i) => (
              <motion.span
                key={`${levelUp}-${i}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: p.scale }}
                transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
                className="absolute top-1/3 size-2.5 rounded-full bg-accent"
              />
            ))}

            <motion.div
              initial={{ scale: 0.4, rotate: -120 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 16 }}
              className="text-white"
            >
              <LogoMark size={110} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-8 text-sm font-semibold tracking-[0.3em] text-accent uppercase"
            >
              Niveau supérieur
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 220, damping: 18 }}
              className="mt-2 text-7xl font-black text-white"
            >
              {levelUp}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-4 max-w-xs text-sm text-white/70"
            >
              Ta discipline paie, joueur. La mission continue.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-8"
            >
              <Button size="lg" onClick={clear} className="glow-accent">
                Continuer
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
