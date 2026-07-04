import type { ProfileStats, PublicUser } from '@one-mission/shared'
import {
  Award,
  BookOpenText,
  CalendarCheck,
  Crown,
  Flame,
  Medal,
  Rocket,
  ShieldCheck,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: LucideIcon
  /** Progression vers le succès : atteint quand current >= target. */
  progress: (user: PublicUser, stats: ProfileStats) => { current: number; target: number }
}

const HOUR = 3600

/** Succès, du plus accessible au plus légendaire (l'ordre est celui de l'affichage). */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-quest',
    title: 'Première quête',
    description: 'Terminer ta toute première quête.',
    icon: Swords,
    progress: (_u, s) => ({ current: s.questsDone, target: 1 }),
  },
  {
    id: 'quests-10',
    title: 'Aventurier',
    description: 'Terminer 10 quêtes.',
    icon: Medal,
    progress: (_u, s) => ({ current: s.questsDone, target: 10 }),
  },
  {
    id: 'quests-100',
    title: 'Centurion',
    description: 'Terminer 100 quêtes.',
    icon: Trophy,
    progress: (_u, s) => ({ current: s.questsDone, target: 100 }),
  },
  {
    id: 'level-10',
    title: 'Niveau 10',
    description: 'Atteindre le niveau 10.',
    icon: Sparkles,
    progress: (u) => ({ current: u.level, target: 10 }),
  },
  {
    id: 'level-25',
    title: 'Niveau 25',
    description: 'Atteindre le niveau 25.',
    icon: Rocket,
    progress: (u) => ({ current: u.level, target: 25 }),
  },
  {
    id: 'level-50',
    title: 'Niveau 50',
    description: 'Atteindre le niveau 50.',
    icon: Crown,
    progress: (u) => ({ current: u.level, target: 50 }),
  },
  {
    id: 'streak-7',
    title: 'Une semaine de feu',
    description: '7 jours d’activité d’affilée.',
    icon: Flame,
    progress: (u) => ({ current: u.longestStreak, target: 7 }),
  },
  {
    id: 'streak-30',
    title: 'Un mois de feu',
    description: '30 jours d’activité d’affilée.',
    icon: Flame,
    progress: (u) => ({ current: u.longestStreak, target: 30 }),
  },
  {
    id: 'weekly-25',
    title: 'Rituel installé',
    description: 'Réaliser 25 quêtes hebdomadaires.',
    icon: CalendarCheck,
    progress: (_u, s) => ({ current: s.weeklyCompletions, target: 25 }),
  },
  {
    id: 'focus-10h',
    title: 'Concentré',
    description: '10 heures de DeepWork cumulées.',
    icon: Timer,
    progress: (_u, s) => ({ current: Math.floor(s.focusSeconds / HOUR), target: 10 }),
  },
  {
    id: 'focus-100h',
    title: 'Maître du focus',
    description: '100 heures de DeepWork cumulées.',
    icon: Timer,
    progress: (_u, s) => ({ current: Math.floor(s.focusSeconds / HOUR), target: 100 }),
  },
  {
    id: 'clean-7',
    title: 'Volonté d’acier',
    description: '7 jours sans rechute.',
    icon: ShieldCheck,
    progress: (_u, s) => ({ current: s.longestCleanDays, target: 7 }),
  },
  {
    id: 'clean-30',
    title: 'Libéré',
    description: '30 jours sans rechute.',
    icon: ShieldCheck,
    progress: (_u, s) => ({ current: s.longestCleanDays, target: 30 }),
  },
  {
    id: 'journal-10',
    title: 'Plume assidue',
    description: 'Écrire 10 entrées de journal.',
    icon: BookOpenText,
    progress: (_u, s) => ({ current: s.journalEntries, target: 10 }),
  },
  {
    id: 'main-quest',
    title: 'Mission accomplie',
    description: 'Terminer ta quête principale.',
    icon: Award,
    progress: (_u, s) => ({ current: s.mainQuestsDone, target: 1 }),
  },
]
