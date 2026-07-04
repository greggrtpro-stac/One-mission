import type { Language } from '@one-mission/shared'
import { useAuthStore } from '@/stores/auth'

/**
 * Architecture i18n minimale : la langue vit sur le compte (user.language),
 * chaque langue est un dictionnaire plat. Ajouter une langue = compléter son
 * dictionnaire ci-dessous et passer `available` à true dans LANGUAGE_OPTIONS.
 * Les pages peuvent adopter `useI18n()` progressivement ; toute clé manquante
 * retombe sur le français.
 */

export const LANGUAGE_OPTIONS: { id: Language; label: string; available: boolean }[] = [
  { id: 'fr', label: 'Français', available: true },
  { id: 'en', label: 'English', available: false },
]

const fr = {
  'settings.title': 'Paramètres',
  'settings.subtitle': 'Ton compte, tes préférences et ta sécurité.',
  'settings.account': 'Compte',
  'settings.preferences': 'Préférences',
  'settings.security': 'Sécurité',
} as const

export type TranslationKey = keyof typeof fr

const dictionaries: Record<Language, Partial<Record<TranslationKey, string>>> = {
  fr,
  en: {
    'settings.title': 'Settings',
    'settings.subtitle': 'Your account, preferences and security.',
    'settings.account': 'Account',
    'settings.preferences': 'Preferences',
    'settings.security': 'Security',
  },
}

export function translate(lang: Language, key: TranslationKey): string {
  return dictionaries[lang]?.[key] ?? fr[key]
}

/** Langue du compte + fonction de traduction. */
export function useI18n() {
  const user = useAuthStore((s) => s.user)
  const lang: Language = user?.language ?? 'fr'
  return { lang, t: (key: TranslationKey) => translate(lang, key) }
}
