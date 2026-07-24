import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Ban,
  BookOpenText,
  BrainCircuit,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  Flame,
  GitBranch,
  Heart,
  Lock,
  Play,
  Repeat,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Swords,
  Timer,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/http'
import { waitForApiReady } from '@/api/ready'
import { LegalFooterLinks } from '@/components/LegalFooterLinks'
import { Badge, Button, Card, Logo, LogoMark, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/cn'
import { PricingSection } from '@/features/subscription/PricingSection'
import { InteractiveDemo } from './InteractiveDemo'
import './landing.css'

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

const ALL_IN_ONE_TAGS = ['Tâches', 'Routines', 'Planning', 'DeepWork', 'Journal', 'Addictions', 'Objectifs', 'Classement', 'Statistiques', 'IA', 'Progression']

const DISCIPLINE_CARDS = [
  { icon: Repeat, title: 'Routines', text: 'Matin et soir, structurées et suivies jour après jour.' },
  { icon: CalendarDays, title: 'Planning', text: 'Respecte ton planning et tes blocs de temps, jour après jour.' },
  { icon: ShieldCheck, title: 'Addictions', text: 'Compte les jours, bats ton record, reprends le contrôle.' },
  { icon: Flame, title: 'Séries', text: 'La régularité récompensée par des séries qui s’allongent.' },
  { icon: TrendingUp, title: 'Régularité', text: 'Un score de constance qui reflète ton engagement réel.' },
  { icon: CalendarCheck, title: 'Objectifs hebdo', text: 'Des cibles hebdomadaires claires, validées en fin de semaine.' },
]

const RELIABILITY_CARDS = [
  { icon: Ban, title: 'Sans publicité', text: 'Zéro pub, zéro distraction.' },
  { icon: RefreshCw, title: 'Synchronisation', text: 'Tes données sur tous tes appareils.' },
  { icon: Zap, title: 'Interface rapide', text: 'Navigation instantanée, sans latence.' },
  { icon: Database, title: 'Données sauvegardées', text: 'Sauvegarde continue et sécurisée.' },
  { icon: Lock, title: 'Sécurité', text: 'Chiffrement et confidentialité par défaut.' },
  { icon: GitBranch, title: 'Mises à jour', text: 'De nouvelles fonctionnalités en continu.' },
  { icon: Smartphone, title: 'Responsive', text: 'Parfait sur desktop, tablette et mobile.' },
  { icon: Heart, title: 'Fait avec soin', text: 'Chaque détail pensé pour durer.' },
]

const AUDIENCE_CARDS = [
  { emoji: '🎓', title: 'Étudiants', text: 'Préparer les examens, rester discipliné et suivre ses révisions.' },
  { emoji: '💼', title: 'Entrepreneurs', text: 'Organiser ses journées et atteindre ses objectifs.' },
  { emoji: '💻', title: 'Développeurs', text: 'Gérer ses projets et ses sessions DeepWork.' },
  { emoji: '🏋️', title: 'Sportifs', text: 'Suivre ses entraînements et rester constant.' },
  { emoji: '🎥', title: 'Créateurs de contenu', text: 'Planifier les publications et respecter son planning.' },
  { emoji: '✦', title: '…et toi', text: 'Quel que soit ton objectif, One Mission s’adapte à ta mission.', highlight: true },
]

type ComparisonStatus = 'yes' | 'partial' | 'no'
const COMPARISON_ROWS: [string, ComparisonStatus, ComparisonStatus, string?][] = [
  ['Gestion des tâches', 'yes', 'yes'],
  ['Catégories personnalisées', 'yes', 'yes'],
  ['Priorités des tâches', 'yes', 'yes'],
  ['Synchronisation multi-appareils', 'yes', 'yes'],
  ['Planning intégré', 'yes', 'partial'],
  ['Sessions DeepWork (Pomodoro)', 'yes', 'partial'],
  ['Statistiques personnelles', 'yes', 'partial'],
  ['Quêtes hebdomadaires', 'yes', 'no'],
  ['Quête principale', 'yes', 'no'],
  ['Routine matin & soir', 'yes', 'no'],
  ['Journal quotidien', 'yes', 'no'],
  ['Suivi des addictions', 'yes', 'no'],
  ['Progression en XP', 'yes', 'no'],
  ['Niveaux & gamification', 'yes', 'no'],
  ['Série de discipline (streak)', 'yes', 'no'],
  ['Citations quotidiennes', 'yes', 'no'],
  ['Classement mondial', 'yes', 'no'],
  ['Amis', 'yes', 'no'],
  ['Guildes', 'yes', 'no'],
  ['Analyse IA du journal', 'yes', 'no', 'Bientôt'],
  ['Coach IA personnel', 'yes', 'no', 'Bientôt'],
]

const FAQ_ITEMS = [
  {
    q: 'Puis-je utiliser One Mission gratuitement ?',
    a: 'Oui. Le plan Starter est gratuit pour toujours et sans carte bancaire : quêtes illimitées, planning, routines, DeepWork, journal et classement mondial sont inclus.',
  },
  {
    q: 'Puis-je annuler mon abonnement à tout moment ?',
    a: 'Bien sûr. Tu peux passer à un plan supérieur, revenir en arrière ou annuler quand tu veux, en un clic depuis tes paramètres. Aucun engagement.',
  },
  {
    q: 'Mes données sont-elles sauvegardées ?',
    a: 'Oui, tout est sauvegardé automatiquement et synchronisé en continu. Tu retrouves ta progression sur tous tes appareils, sans rien perdre.',
  },
  {
    q: 'Mes données sont-elles privées ?',
    a: 'Absolument. Tes données t’appartiennent, ne sont jamais revendues, et restent chiffrées. Tu peux les exporter ou les supprimer à tout moment.',
  },
  {
    q: 'Une application mobile est-elle prévue ?',
    a: 'One Mission est déjà parfaitement responsive sur mobile et tablette. Des applications natives iOS et Android sont sur la feuille de route.',
  },
  {
    q: 'Quelle est la différence entre Pro et Max ?',
    a: 'Pro débloque le suivi d’addictions, l’analyse IA du journal et les statistiques avancées. Max ajoute le coach IA personnel, ses messages automatiques et le support prioritaire.',
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

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
}

/** Survol violet des cartes « Discipline » et « Fiabilité » : bordure + halo + fond éclairci + léger soulèvement. */
const violetHover =
  'transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:border-accent hover:bg-surface-2 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_20px_45px_-20px_rgba(139,92,246,0.45)]'

/** Eyebrow + titre de section, motif répété tel quel dans tout le design. */
function SectionHeading({ eyebrow, title, text, center }: { eyebrow: string; title: ReactNode; text?: string; center?: boolean }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={reveal}
      className={center ? 'mb-11 text-center' : 'mb-11 max-w-xl'}
    >
      <p className="landing-mono text-[11px] font-semibold tracking-[0.1em] text-accent uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className={center ? 'mx-auto mt-3 max-w-xl text-[15px] text-muted' : 'mt-3 text-[15px] text-muted'}>{text}</p>}
    </motion.div>
  )
}

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
    <div className="landing-page relative min-h-screen w-full overflow-x-hidden bg-bg text-ink">
      {/* Fond quadrillé + halo violet du hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px] opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(1100px 820px at 50% 4%, #000, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(1100px 820px at 50% 4%, #000, transparent 78%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-320px] mx-auto h-[640px] w-[880px] rounded-full opacity-25 blur-[60px]"
        style={{
          background: 'radial-gradient(closest-side, var(--accent), transparent)',
          // Correctif définitif crash WebKit (pincer-zoomer iOS Safari) —
          // bissection confirmée sur la branche : ce halo et celui du
          // mockup ne doivent jamais se superposer dans la composition
          // GPU. clipPath retire la moitié basse (celle tournée vers le
          // mockup, plus bas sur la page) : géométrie identique à celle
          // qui a fait disparaître le crash sur plusieurs essais répétés.
          // maskImage fait s'estomper le halo jusqu'à un alpha nul AVANT
          // d'atteindre cette limite (35%→55%) : la coupe tombe dans une
          // zone déjà invisible, aucun bord dur perceptible — rendu
          // visuel inchangé, mêmes couleur/opacité/taille/position/flou.
          clipPath: 'inset(0 0 45% 0)',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 35%, transparent 55%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 35%, transparent 55%)',
        }}
      />

      {/* ── Navigation ──
          Logo légèrement réduit sous 768px (deux instances, une par
          breakpoint — la taille du logo se pilote par prop JS, pas par
          classe CSS) : tient sur une seule ligne à toutes les largeurs
          mobiles courantes (dès 360 px). flex-wrap sur le header ET la nav
          reste un filet de sécurité pour les cas extrêmes (zoom navigateur,
          texte agrandi par accessibilité…) : la nav passerait alors sous le
          logo — qui reste à gauche — plutôt que de déborder. */}
      <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-4 md:flex-nowrap md:px-6 md:py-5">
        <span className="md:hidden">
          <Logo size={22} className="shrink-0" />
        </span>
        <span className="hidden shrink-0 md:inline-flex">
          <Logo size={30} />
        </span>
        <nav className="flex flex-wrap items-center justify-end gap-1 max-md:ml-auto md:flex-nowrap md:gap-2">
          <a href="#tarification" className="mr-2 hidden text-sm font-medium text-muted hover:text-ink sm:inline">
            Tarifs
          </a>
          <Link to="/login">
            <Button
              variant="ghost"
              className="max-md:h-8 max-md:gap-1.5 max-md:rounded-lg max-md:px-2.5 max-md:text-[13px]"
            >
              Se connecter
            </Button>
          </Link>
          <Link to="/register">
            <Button className="max-md:h-8 max-md:gap-1.5 max-md:rounded-lg max-md:px-2.5 max-md:text-[13px]">
              Commencer
            </Button>
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center pt-16 pb-10 text-center sm:pt-24">
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
            <a href="#demo">
              <Button size="lg" variant="secondary">
                Découvrir
              </Button>
            </a>
          </motion.div>
          <motion.p
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="landing-mono mt-4 text-[11.5px] text-faint"
          >
            Essaie la démo ci-dessous — aucune inscription requise
          </motion.p>
        </section>

        {/* ── Démo interactive ── */}
        <motion.section
          id="demo"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={reveal}
          className="relative scroll-mt-20 pb-5"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-2.5 mx-auto h-[460px] w-[1040px] max-w-full rounded-full opacity-40 blur-[70px]"
            style={{
              background: 'radial-gradient(closest-side, rgba(139,92,246,.6), transparent)',
              // Correctif définitif — symétrique du halo Hero ci-dessus :
              // retire la moitié haute (tournée vers le Hero, plus haut
              // sur la page), avec la même marge de fondu invisible avant
              // la coupe. Voir le commentaire détaillé sur le halo Hero.
              clipPath: 'inset(45% 0 0 0)',
              maskImage: 'linear-gradient(to top, #000 0%, #000 35%, transparent 55%)',
              WebkitMaskImage: 'linear-gradient(to top, #000 0%, #000 35%, transparent 55%)',
            }}
          />
          {/* Sous md uniquement : élargit de 40px (20px de chaque côté) la
              largeur disponible pour le mockup, sans toucher au composant
              lui-même — celui-ci mesure sa largeur réelle et s'affiche donc
              mécaniquement ~10-15% plus grand sur téléphone, même cadrage,
              même calcul d'échelle, aucun autre effet (neutre dès md, et le
              halo ci-dessus n'est pas concerné). */}
          <div className="max-md:-mx-5">
            <InteractiveDemo />
          </div>
        </motion.section>

        {/* ── Fonctionnalités ── */}
        <section id="features" className="pb-24">
          <SectionHeading
            center
            eyebrow="Fonctionnalités"
            title={
              <>
                Tout pour devenir <span className="text-accent">la meilleure version</span> de toi-même
              </>
            }
            text="Un système complet de progression, pensé comme un jeu."
          />

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

        {/* ── Tout-en-un ── */}
        <section className="grid gap-10 border-t border-line py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14">
          <div>
            <SectionHeading
              eyebrow="Tout-en-un"
              title={
                <>
                  Tout ce dont tu as besoin.
                  <br />
                  Au même endroit.
                </>
              }
              text="Arrête de jongler entre cinq applications. One Mission rassemble toutes les briques de ta progression dans une seule interface, pensée comme un jeu."
            />
            <div className="flex flex-wrap gap-2">
              {ALL_IN_ONE_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/50 px-3.5 py-1.5 text-[12.5px] text-ink"
                >
                  <span className="size-1.5 rounded-full bg-accent" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={reveal}
            className="relative hidden min-h-[340px] lg:block"
          >
            <div className="absolute top-0 left-[6%] w-[210px] rounded-2xl border border-line bg-surface p-4 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Swords size={16} />
                </span>
                <span className="text-[13px] font-semibold">Quêtes</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={64} size="sm" />
              </div>
              <p className="landing-mono mt-2 text-[10.5px] text-faint">+50 XP · aujourd’hui</p>
            </div>
            <div className="absolute top-16 right-[2%] w-[200px] rounded-2xl border border-line bg-surface p-4 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Timer size={16} />
                </span>
                <span className="text-[13px] font-semibold">DeepWork</span>
              </div>
              <p className="landing-mono mt-3 text-xl font-semibold">1:25</p>
              <p className="mt-0.5 text-[11px] text-muted">focus aujourd’hui</p>
            </div>
            <div className="absolute top-[172px] left-0 w-[196px] rounded-2xl border border-line bg-surface p-4 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Flame size={16} />
                </span>
                <span className="text-[13px] font-semibold">Série</span>
              </div>
              <p className="landing-mono mt-3 text-xl font-semibold">12 j</p>
            </div>
            <div
              className="absolute top-[210px] right-[8%] w-[210px] rounded-2xl border border-accent/30 p-4 shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface) 60%)' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent-hover">
                  <TrendingUp size={16} />
                </span>
                <span className="text-[13px] font-semibold">Niveau 7</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={68} size="sm" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Progression ── */}
        <section className="border-t border-line py-24">
          <SectionHeading
            center
            eyebrow="Progression"
            title="Chaque journée te rapproche de tes objectifs."
            text="Chaque action rapporte de l’XP. Chaque quête fait progresser. Chaque semaine compte, chaque mois est mesuré."
          />
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, label: 'par quête terminée', value: '+50 XP' },
              { icon: TrendingUp, label: null, value: 'Niveau 7', bar: 68 },
              { icon: Trophy, label: 'débloqués cette saison', value: '14 badges' },
              { icon: CalendarCheck, label: 'XP cette semaine', value: '+1 240' },
            ].map((s, i) => (
              <div key={i} className="bg-bg p-6">
                <s.icon size={19} className="text-accent-hover" />
                <p className="landing-mono mt-3.5 text-2xl font-semibold">{s.value}</p>
                {s.label && <p className="mt-1 text-[12.5px] text-muted">{s.label}</p>}
                {s.bar !== undefined && (
                  <div className="mt-2.5">
                    <ProgressBar value={s.bar} size="sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Card className="mt-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">XP des 12 dernières semaines</span>
              <span className="landing-mono text-xs text-muted">+38 % vs mois dernier</span>
            </div>
            <div className="mt-5 flex h-24 items-end gap-1.5">
              {[30, 45, 38, 60, 52, 70, 58, 74, 66, 82, 76, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded"
                  style={{ height: `${h}%`, background: i === 11 ? 'var(--accent)' : 'var(--accent-soft)' }}
                />
              ))}
            </div>
          </Card>
        </section>

        {/* ── Discipline durable ── */}
        <section className="border-t border-line py-24">
          <SectionHeading
            eyebrow="Discipline"
            title="Construis une discipline durable."
            text="La discipline ne se construit pas en un jour. One Mission mesure ta régularité sur la durée."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINE_CARDS.map((c, i) => (
              <motion.div key={c.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={fadeUp}>
                <Card className={cn('h-full p-5', violetHover)}>
                  <span className="inline-flex size-10 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
                    <c.icon size={20} />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold">{c.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.text}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Focus ── */}
        <section className="grid gap-10 border-t border-line py-24 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <SectionHeading
              eyebrow="Focus"
              title="Travaille avec concentration."
              text="Des sessions Pomodoro chronométrées. One Mission mesure ton temps de focus, ton temps productif et ce que tu laisses filer."
            />
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Temps focus', '1 h 25'],
                ['Sessions', '3 aujourd’hui'],
                ['Temps productif', '82 %'],
                ['Cette semaine', '4 h 10'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line px-4 py-3.5">
                  <p className="text-[11.5px] text-muted">{label}</p>
                  <p className="landing-mono mt-1.5 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={reveal}>
            <Card className="flex flex-col items-center p-8" style={{ background: 'radial-gradient(500px 260px at 50% 0%, var(--accent-soft), transparent 70%)' }}>
              <svg width={180} height={180} viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="86" fill="none" stroke="var(--line)" strokeWidth="6" />
                <circle
                  cx="100"
                  cy="100"
                  r="86"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="405 135"
                  transform="rotate(-90 100 100)"
                />
                <text x="100" y="94" textAnchor="middle" fill="var(--accent-hover)" fontFamily="'Geist Mono', monospace" fontSize="12" fontWeight="600" letterSpacing="2">
                  FOCUS
                </text>
                <text x="100" y="122" textAnchor="middle" fill="var(--ink)" fontFamily="'Geist Mono', monospace" fontSize="28" fontWeight="600">
                  18:20
                </text>
              </svg>
              <div className="mt-5 flex h-14 w-full items-end gap-1.5">
                {[40, 65, 30, 80, 55, 70, 88].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: 'var(--accent-soft)' }} />
                ))}
              </div>
            </Card>
          </motion.div>
        </section>

        {/* ── Coach IA ── */}
        <section className="grid gap-10 border-t border-line py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={reveal}>
            <Card className="p-6">
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-accent-soft text-accent-hover">
                  <Sparkles size={17} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold">Coach One Mission</p>
                  <p className="text-[11px] text-success">● en ligne</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-[13px] text-on-accent">
                  Journée compliquée, j’ai procrastiné cet après-midi.
                </div>
                <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed">
                  Tu as quand même tenu ta séance de sport et 1 h 25 de DeepWork 💪 Demain, planifie un bloc focus juste après le déjeuner — c’est là que tu décroches.
                </div>
              </div>
            </Card>
          </motion.div>
          <div>
            <SectionHeading eyebrow="Intelligence" title="Ton coach IA personnel." />
            <ul className="flex flex-col gap-3">
              {[
                'Analyse ton journal et ta semaine',
                'Te motive quand tu décroches',
                'Repère tes écarts de discipline',
                'Propose des axes d’amélioration concrets',
                'Te fixe des objectifs atteignables',
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-ink/90">
                  <Check size={17} className="mt-0.5 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Vue d'ensemble ── */}
        <section className="border-t border-line py-24">
          <SectionHeading center eyebrow="Vue d’ensemble" title="Visualise ta progression." />
          <Card className="p-6">
            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Niveau', '7'],
                ['XP totale', '4 316'],
                ['DeepWork', '72 h'],
                ['Sans addiction', '34 j'],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-4.5 py-4">
                  <p className="text-[11px] text-muted">{label}</p>
                  <p className="landing-mono mt-1.5 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-line p-4.5">
                <span className="text-[13px] font-semibold">Courbe d’XP</span>
                <svg viewBox="0 0 320 90" className="mt-3 h-[90px] w-full">
                  <polyline fill="var(--accent-soft)" stroke="none" points="0,90 0,78 40,70 80,72 120,54 160,58 200,40 240,44 280,24 320,14 320,90" />
                  <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" points="0,78 40,70 80,72 120,54 160,58 200,40 240,44 280,24 320,14" />
                </svg>
              </div>
              <div className="rounded-xl border border-line p-4.5">
                <span className="text-[13px] font-semibold">Objectifs</span>
                <div className="mt-3.5 flex flex-col gap-3">
                  {[
                    ['SaaS', 45],
                    ['10 km', 60],
                    ['Épargne', 30],
                  ].map(([label, pct]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-muted">
                        <span>{label}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar value={pct as number} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ── Fiabilité ── */}
        <section className="border-t border-line py-24">
          <SectionHeading eyebrow="Fiabilité" title="Pensé pour durer." />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {RELIABILITY_CARDS.map((c) => (
              <div key={c.title} className={cn('rounded-2xl border border-line bg-surface p-5', violetHover)}>
                <span className="inline-flex size-9.5 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                  <c.icon size={18} />
                </span>
                <h3 className="mt-3.5 text-sm font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparaison ── */}
        <section className="border-t border-line py-24">
          <SectionHeading center eyebrow="Comparaison" title="Pourquoi One Mission ?" />
          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="grid grid-cols-[1.6fr_1fr_1fr] bg-surface-2/40">
              <div className="px-5 py-4 text-xs font-semibold tracking-wide text-muted uppercase">Fonctionnalité</div>
              <div className="border-l border-line px-5 py-4 text-center text-[13px] font-bold text-accent-hover">One Mission</div>
              <div className="border-l border-line px-5 py-4 text-center text-[13px] font-semibold text-muted">Apps classiques</div>
            </div>
            {COMPARISON_ROWS.map(([label, om, other, tag], i) => (
              <div key={label} className={'grid grid-cols-[1.6fr_1fr_1fr] border-t border-line' + (i % 2 ? ' bg-surface-2/20' : '')}>
                <div className="flex items-center px-5 py-3 text-[13.5px]">
                  {label}
                  {tag && <Badge variant="success" className="ml-2.5">{tag}</Badge>}
                </div>
                <div className="flex justify-center border-l border-line px-5 py-3">
                  <ComparisonMark status={om} />
                </div>
                <div className="flex justify-center border-l border-line px-5 py-3">
                  <ComparisonMark status={other} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-5 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-success" />
              Disponible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-warning">▲</span>
              Disponible partiellement
            </span>
            <span className="inline-flex items-center gap-1.5">
              <X size={14} className="text-faint" />
              Non disponible
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-relaxed text-ink/80">
            One Mission n’est pas une simple application de tâches. C’est un système complet conçu pour transformer tes objectifs en résultats grâce à la discipline, la progression et la gamification.
          </p>
        </section>

        {/* ── Écosystème ── */}
        <section className="border-t border-line py-24 text-center">
          <p className="landing-mono text-[11px] font-semibold tracking-[0.1em] text-accent uppercase">L’écosystème</p>
          <h2 className="mx-auto mt-3 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
            Une seule application.
            <br />
            Pour toute ta progression.
          </h2>
          <div className="relative mx-auto mt-13 flex max-w-lg items-center justify-center">
            <div
              aria-hidden
              className="pointer-events-none absolute size-[340px] rounded-full opacity-30 blur-[90px]"
              style={{ background: 'radial-gradient(closest-side, var(--accent), transparent)' }}
            />
            <div className="relative z-10 flex size-[150px] flex-col items-center justify-center gap-2.5 rounded-[28px] border border-accent bg-surface shadow-[0_30px_80px_-30px_var(--accent-glow)]">
              <LogoMark size={46} />
              <span className="text-xs font-semibold">One Mission</span>
            </div>
          </div>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {['Planning', 'Quêtes', 'Journal', 'IA', 'Routine', 'DeepWork', 'Statistiques'].map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/50 px-4 py-2 text-[13px] text-ink">
                <span className="size-1.5 rounded-full bg-accent" />
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* ── Pour tous ── */}
        <section className="border-t border-line py-24">
          <SectionHeading center eyebrow="Pour tous" title="Pour chacun de tes objectifs." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCE_CARDS.map((c) => (
              <Card
                key={c.title}
                className="p-6"
                style={c.highlight ? { borderColor: 'var(--accent)', background: 'linear-gradient(135deg, var(--accent-soft), transparent 60%)' } : undefined}
              >
                <span className="text-2xl">{c.emoji}</span>
                <h3 className="mt-3.5 font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="border-t border-line py-24">
          <div
            className="relative overflow-hidden rounded-3xl border border-accent px-8 py-16 text-center"
            style={{ background: 'radial-gradient(700px 340px at 50% 0%, var(--accent-soft), transparent 70%)' }}
          >
            <h2 className="relative text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              Prêt à reprendre le contrôle
              <br />
              de tes journées ?
            </h2>
            <p className="relative mx-auto mt-5 max-w-md text-muted">
              Transforme ta discipline en progression mesurable. Ta première quête t’attend — et elle est gratuite.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="glow-accent">
                  Commencer gratuitement
                </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="secondary">
                  <Play size={15} />
                  Découvrir la démo
                </Button>
              </a>
            </div>
          </div>
        </section>

        <div id="tarification" className="scroll-mt-6">
          <PricingSection />
        </div>

        {/* ── FAQ ── */}
        <section className="pt-4 pb-24">
          <SectionHeading center eyebrow="FAQ" title="Questions fréquentes" />
          <div className="mx-auto flex max-w-[760px] flex-col gap-3">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-2xl border transition-colors duration-300"
                  style={open ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : { borderColor: 'var(--line)' }}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-[15px] font-semibold"
                  >
                    {item.q}
                    <ChevronDown
                      size={20}
                      className="shrink-0 text-accent-hover transition-transform duration-300"
                      style={{ transform: open ? 'rotate(180deg)' : undefined }}
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-muted">{item.a}</p>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </section>
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

function ComparisonMark({ status }: { status: ComparisonStatus }) {
  if (status === 'yes') return <Check size={17} className="text-success" />
  if (status === 'partial') return <span className="text-[13px] font-semibold text-warning">▲</span>
  return <X size={17} className="text-faint" />
}
