import {
  isCommonPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordCriteria,
} from '@one-mission/shared'
import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Le pseudo doit faire au moins 3 caractères')
  .max(20, 'Le pseudo doit faire au plus 20 caractères')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Lettres, chiffres, tirets, points et underscores uniquement')

/**
 * Prénom / nom : espaces superflus retirés, caractères de contrôle et
 * chevrons interdits (aucun HTML ne doit pouvoir transiter par ces champs).
 */
export const nameSchema = z
  .string()
  .trim()
  .max(50, '50 caractères maximum')
  .regex(/^[^<>\p{Cc}\p{Cf}]*$/u, 'Caractères non autorisés')

/** E-mail : espaces retirés, minuscules, longueur RFC. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Votre adresse e-mail n’est pas valide.'))
  .pipe(z.string().max(254, 'Votre adresse e-mail n’est pas valide.'))

/**
 * Politique de mot de passe (nouveaux mots de passe uniquement — la
 * connexion accepte les mots de passe existants plus courts).
 * Mêmes règles que la checklist temps réel côté client.
 */
export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  )
  .max(PASSWORD_MAX_LENGTH, 'Le mot de passe est trop long.')
  .superRefine((pwd, ctx) => {
    const c = passwordCriteria(pwd)
    if (!c.uppercase) {
      ctx.addIssue({ code: 'custom', message: 'Le mot de passe doit contenir une majuscule.' })
    }
    if (!c.lowercase) {
      ctx.addIssue({ code: 'custom', message: 'Le mot de passe doit contenir une minuscule.' })
    }
    if (!c.digit) {
      ctx.addIssue({ code: 'custom', message: 'Le mot de passe doit contenir un chiffre.' })
    }
    if (!c.special) {
      ctx.addIssue({ code: 'custom', message: 'Le mot de passe doit contenir un caractère spécial.' })
    }
    if (isCommonPassword(pwd)) {
      ctx.addIssue({ code: 'custom', message: 'Ce mot de passe est trop courant, choisissez-en un plus original.' })
    }
  })

/**
 * Jeton Cloudflare Turnstile — vérifié côté serveur, jamais sur la seule foi
 * du client. Chaîne quelconque au niveau du schéma (une chaîne vide est
 * envoyée par le client quand l'anti-robot n'est pas configuré, ex. en
 * développement) : le véritable contrôle a lieu dans requireTurnstile(),
 * qui appelle l'API Cloudflare et n'accepte une chaîne vide que si
 * TURNSTILE_SECRET_KEY est lui-même absent côté serveur.
 */
export const turnstileTokenSchema = z.string().default('')

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  turnstileToken: turnstileTokenSchema,
})

/** Coché : cookie de refresh persistant (30 j). Décoché (par défaut) : cookie de session. */
export const rememberMeSchema = z.boolean().optional().default(false)

export const loginSchema = z.object({
  email: emailSchema,
  // Pas de politique ici : les comptes existants gardent leur mot de passe.
  password: z.string().min(1, 'Mot de passe requis').max(PASSWORD_MAX_LENGTH),
  turnstileToken: turnstileTokenSchema,
  rememberMe: rememberMeSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  turnstileToken: turnstileTokenSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: passwordSchema,
})

export const resendVerificationSchema = z.object({
  email: emailSchema,
  turnstileToken: turnstileTokenSchema,
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1).max(200),
  /** Identifiant public du compte, en secours pour distinguer un lien déjà utilisé d'un lien invalide. */
  uid: z.string().min(1).max(64).optional(),
})

export const googleAuthSchema = z.object({
  /** id_token renvoyé par Google Identity Services. */
  credential: z.string().min(1),
  rememberMe: rememberMeSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
