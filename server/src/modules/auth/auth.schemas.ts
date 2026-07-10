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
  .pipe(z.email('Adresse e-mail invalide'))
  .pipe(z.string().max(254, 'Adresse e-mail trop longue'))

/**
 * Politique de mot de passe (nouveaux mots de passe uniquement — la
 * connexion accepte les mots de passe existants plus courts).
 * Mêmes règles que la checklist temps réel côté client.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères`)
  .max(PASSWORD_MAX_LENGTH, 'Mot de passe trop long')
  .superRefine((pwd, ctx) => {
    const c = passwordCriteria(pwd)
    if (!c.uppercase) ctx.addIssue({ code: 'custom', message: 'Il manque une lettre majuscule' })
    if (!c.lowercase) ctx.addIssue({ code: 'custom', message: 'Il manque une lettre minuscule' })
    if (!c.digit) ctx.addIssue({ code: 'custom', message: 'Il manque un chiffre' })
    if (!c.special) {
      ctx.addIssue({ code: 'custom', message: 'Il manque un caractère spécial (!@#$%…)' })
    }
    if (isCommonPassword(pwd)) {
      ctx.addIssue({ code: 'custom', message: 'Ce mot de passe est trop courant, choisis-en un plus original' })
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

export const loginSchema = z.object({
  email: emailSchema,
  // Pas de politique ici : les comptes existants gardent leur mot de passe.
  password: z.string().min(1, 'Mot de passe requis').max(PASSWORD_MAX_LENGTH),
  turnstileToken: turnstileTokenSchema,
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
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
