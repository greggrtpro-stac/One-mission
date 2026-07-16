import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BookOpenText,
  BrainCircuit,
  ShieldCheck,
  Swords,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/api/http'
import { waitForApiReady } from '@/api/ready'
import { LegalFooterLinks } from '@/components/LegalFooterLinks'
import { Badge, Button, Card, Logo, LogoMark, ProgressBar } from '@/components/ui'
import { PricingSection } from '@/features/subscription/PricingSection'

const features = [
  {
    icon: Swords,
    title: 'Quêtes quotidiennes',
    text: 'Chaque tâche devient une quête avec priorité, difficulté et récompense en XP.',
  },
  {
    icon: TrendingUp,
    title: 'XP & Niveaux',
    text: 'Gagne de l’expérience, monte de niveau et mesure ta progression réelle.',
  },
  {
    icon: BrainCircuit,
    title: 'DeepWork',
    text: 'Des sessions de concentration profonde, chronométrées et analysées.',
  },
  {
    icon: ShieldCheck,
    title: 'Suivi d’addictions',
    text: 'Compte les jours, bats ton record et visualise ta liberté retrouvée.',
  },
  {
    icon: BookOpenText,
    title: 'Journal + IA',
    text: 'Une analyse honnête et sans complaisance de chacune de tes journées.',
  },
  {
    icon: Trophy,
    title: 'Classement',
    text: 'Affronte les autres joueurs et grimpe au sommet du leaderboard.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.5, ease: 'easeOut' as const },
  }),
}

export function LandingPage() {
  const health = useQuery({
    queryKey: ['health'],
    // Attend que l'API réponde avant la première requête : au lancement du
    // projet, le backend démarre après Vite et la pastille afficherait
    // « API hors ligne » (et une erreur console) le temps qu'il soit prêt.
    queryFn: async () => {
      await waitForApiReady()
      return api<{ status: string }>('/api/health')
    },
  })

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg text-ink">
      {/* Halo violet d’arrière-plan */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-320px] mx-auto h-[640px] w-[880px] rounded-full opacity-25 blur-[120px]"
        style={{ background: 'radial-gradient(closest-side, var(--accent), transparent)' }}
      />

      {/* ── Navigation ── */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo size={30} />
        <nav className="flex items-center gap-2">
          <a href="#pricing" className="mr-2 hidden text-sm font-medium text-muted hover:text-ink sm:inline">
            Tarifs
          </a>
          <Link to="/login">
            <Button variant="ghost">Se connecter</Button>
          </Link>
          <Link to="/register">
            <Button>Commencer</Button>
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center pt-20 pb-24 text-center sm:pt-28">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
            <Badge variant="accent" className="mb-6 px-3 py-1 text-[13px]">
              ✦ Gamifie ta discipline
            </Badge>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="max-w-3xl text-5xl leading-[1.05] font-bold tracking-tight sm:text-7xl"
          >
            Une vie.
            <br />
            <span className="text-accent">Une mission.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg text-muted"
          >
            One Mission transforme tes objectifs en quêtes, ta discipline en XP et tes journées en
            progression mesurable. Joue ta vie — et gagne-la.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/register">
              <Button size="lg" className="glow-accent">
                Commencer gratuitement
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="secondary">
                Découvrir
              </Button>
            </a>
          </motion.div>

          {/* Aperçu gamification */}
          <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="mt-16 w-full max-w-md">
            <Card className="p-5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LogoMark size={36} />
                  <div>
                    <p className="text-sm font-semibold">Joueur · Niveau 7</p>
                    <p className="text-xs text-muted">1 240 XP au total</p>
                  </div>
                </div>
                <Badge variant="accent">+50 XP</Badge>
              </div>
              <div className="mt-4">
                <ProgressBar value={68} />
                <p className="mt-2 text-xs text-faint">238 XP avant le niveau 8</p>
              </div>
            </Card>
          </motion.div>
        </section>

        {/* ── Fonctionnalités ── */}
        <section id="features" className="pb-28">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tout pour devenir <span className="text-accent">la meilleure version</span> de
              toi-même
            </h2>
            <p className="mt-3 text-muted">
              Un système complet de progression, pensé comme un jeu.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
              >
                <Card hoverable className="h-full p-6">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <f.icon size={22} />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <PricingSection />
      </main>

      {/* ── Pied de page ── */}
      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo size={22} />
          <LegalFooterLinks />
          <p className="flex items-center gap-2 text-xs text-faint">
            <span
              className={
                health.isSuccess
                  ? 'size-2 rounded-full bg-success'
                  : health.isPending
                    ? 'size-2 animate-pulse rounded-full bg-faint'
                    : 'size-2 rounded-full bg-danger'
              }
            />
            {health.isSuccess
              ? 'Tous les systèmes opérationnels'
              : health.isPending
                ? 'Vérification des systèmes…'
                : 'API hors ligne'}
            <span className="mx-1">·</span>© {new Date().getFullYear()} One Mission
          </p>
        </div>
      </footer>
    </div>
  )
}
