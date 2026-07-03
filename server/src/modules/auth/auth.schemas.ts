import { z } from 'zod'

export const usernameSchema = z
  .string()
  .min(3, 'Le pseudo doit faire au moins 3 caractères')
  .max(20, 'Le pseudo doit faire au plus 20 caractères')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Lettres, chiffres, tirets, points et underscores uniquement')

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit faire au moins 8 caractères')
  .max(128, 'Mot de passe trop long')

export const registerSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  password: passwordSchema,
  username: usernameSchema,
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
})

export const loginSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const forgotPasswordSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export const googleAuthSchema = z.object({
  /** id_token renvoyé par Google Identity Services. */
  credential: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
