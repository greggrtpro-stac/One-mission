import { PLAN_LIST, type BillingCycle } from '@one-mission/shared'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BillingCycleToggle } from './BillingCycleToggle'
import { PlanCard } from './PlanCard'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

/**
 * Section pricing publique — visiteurs non connectés uniquement.
 * Les cartes renvoient vers l'inscription : le choix d'offre définitif se
 * fait après connexion, sur la page Level Up.
 */
export function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY')
  const navigate = useNavigate()

  return (
    <section id="pricing" className="pb-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
        className="mb-10 flex flex-col items-center text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Choisissez <span className="text-accent">votre niveau</span>
        </h2>
        <p className="mt-3 max-w-xl text-muted">
          Commence gratuitement, débloque le coach IA et le suivi d’addictions quand tu es prêt à
          aller plus loin.
        </p>
        <div className="mt-6">
          <BillingCycleToggle value={cycle} onChange={setCycle} />
        </div>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
        {PLAN_LIST.map((plan, i) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            billingCycle={cycle}
            index={i}
            onSelect={() => navigate('/register')}
          />
        ))}
      </div>
    </section>
  )
}
