import {
  isCommonPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordCriteria,
} from '@one-mission/shared'
import { ApiRequestError } from '@/api/http'

/**
 * Erreurs par champ des formulaires d'authentification : chaque message est
 * affiché sous le champ concerné ; seules les erreurs sans champ (serveur,
 * réseau, identifiants invalides…) vont dans l'encart global du formulaire.
 */

export type AuthField = 'username' | 'email' | 'password' | 'confirm' | 'privacy' | 'captcha'
export type FieldErrors = Partial<Record<AuthField, string>>

/** Suffisant pour l'UX — la validation stricte (RFC) reste côté serveur. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function emailFieldError(email: string): string | null {
  const value = email.trim()
  if (!value) return 'L’adresse e-mail est requise.'
  if (!EMAIL_RE.test(value)) return 'Votre adresse e-mail n’est pas valide.'
  return null
}

/** Mêmes règles que usernameSchema côté serveur. */
export function usernameFieldError(username: string): string | null {
  const value = username.trim()
  if (!value) return 'Le pseudo est requis.'
  if (value.length < 3) return 'Le pseudo doit faire au moins 3 caractères.'
  if (value.length > 20) return 'Le pseudo doit faire au plus 20 caractères.'
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
    return 'Lettres, chiffres, tirets, points et underscores uniquement.'
  }
  return null
}

/** Première règle de mot de passe non respectée — mêmes libellés que le serveur. */
export function passwordFieldError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  }
  if (password.length > PASSWORD_MAX_LENGTH) return 'Le mot de passe est trop long.'
  const c = passwordCriteria(password)
  if (!c.uppercase) return 'Le mot de passe doit contenir une majuscule.'
  if (!c.lowercase) return 'Le mot de passe doit contenir une minuscule.'
  if (!c.digit) return 'Le mot de passe doit contenir un chiffre.'
  if (!c.special) return 'Le mot de passe doit contenir un caractère spécial.'
  if (isCommonPassword(password)) {
    return 'Ce mot de passe est trop courant, choisissez-en un plus original.'
  }
  return null
}

interface ApiErrorBody {
  code?: string
  details?: { field?: string; message?: string }[]
}

/**
 * Ventile une erreur API vers le champ concerné (e-mail pris, pseudo pris,
 * captcha, validation par champ) ; tout le reste part dans l'encart global.
 */
export function apiErrorToFieldErrors(error: unknown): {
  fields: FieldErrors
  general: string | null
} {
  if (!(error instanceof ApiRequestError)) {
    return { fields: {}, general: 'Une erreur est survenue. Veuillez réessayer plus tard.' }
  }
  const body = (error.details ?? {}) as ApiErrorBody
  switch (body.code) {
    case 'EMAIL_TAKEN':
      return { fields: { email: error.message }, general: null }
    case 'USERNAME_TAKEN':
      return { fields: { username: error.message }, general: null }
    case 'TURNSTILE_FAILED':
      return { fields: { captcha: error.message }, general: null }
    case 'VALIDATION_ERROR': {
      const fields: FieldErrors = {}
      for (const issue of body.details ?? []) {
        if (!issue.message) continue
        if (issue.field === 'email') fields.email ??= issue.message
        else if (issue.field === 'username') fields.username ??= issue.message
        else if (issue.field === 'password') fields.password ??= issue.message
      }
      if (Object.keys(fields).length > 0) return { fields, general: null }
      return { fields: {}, general: error.message }
    }
    default:
      return { fields: {}, general: error.message }
  }
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

/** Fait défiler jusqu'au premier champ en erreur et y place le curseur. */
export function focusFirstError(
  errors: FieldErrors,
  order: AuthField[],
  refs: Partial<Record<AuthField, HTMLElement | null>>,
) {
  const first = order.find((field) => errors[field])
  if (!first) return
  const el = refs[first]
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (el instanceof HTMLInputElement) el.focus({ preventScroll: true })
}
