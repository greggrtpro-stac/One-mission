import { LANGUAGES } from '@one-mission/shared'
import argon2 from 'argon2'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { validateBody } from '../../middleware/validate.js'
import { REFRESH_COOKIE, refreshCookieOptions } from '../auth/auth.routes.js'
import { passwordSchema, usernameSchema } from '../auth/auth.schemas.js'
import { toPublicUser } from './users.mapper.js'

const updateProfileSchema = z.object({
  firstName: z.string().max(50).nullable().optional(),
  lastName: z.string().max(50).nullable().optional(),
  username: usernameSchema.optional(),
  email: z.email('Adresse e-mail invalide').optional(),
  phone: z
    .string()
    .max(30)
    .regex(/^[+\d][\d\s().-]*$/, 'Numéro de téléphone invalide')
    .nullable()
    .optional(),
  /** Data-URL (petite image) ou URL http(s). */
  avatarUrl: z.string().max(300_000).nullable().optional(),
  theme: z.enum(['dark', 'light']).optional(),
  language: z.enum(LANGUAGES).optional(),
  notifications: z
    .object({
      questReminders: z.boolean(),
      weeklyRecap: z.boolean(),
      coachMessages: z.boolean(),
    })
    .optional(),
  showOnLeaderboard: z.boolean().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
})

const deleteAccountSchema = z.object({
  /** Requis si le compte a un mot de passe. */
  password: z.string().optional(),
})

export const usersRouter = Router()
usersRouter.use(requireAuth)

usersRouter.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: getUserId(req) } })
  if (!user) throw new ApiError(404, 'Utilisateur introuvable')
  res.json({ user: toPublicUser(user) })
})

usersRouter.patch('/me', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const data = { ...req.body } as z.infer<typeof updateProfileSchema>

  if (data.email) {
    data.email = data.email.toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing && existing.id !== userId) {
      throw new ApiError(409, 'Un compte existe déjà avec cet e-mail', 'EMAIL_TAKEN')
    }
  }
  if (data.username) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } })
    if (existing && existing.id !== userId) {
      throw new ApiError(409, 'Ce pseudo est déjà pris', 'USERNAME_TAKEN')
    }
  }

  const user = await prisma.user.update({ where: { id: userId }, data })
  res.json({ user: toPublicUser(user) })
})

usersRouter.patch(
  '/me/password',
  validateBody(changePasswordSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(req)
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'Utilisateur introuvable')

    // Un compte Google sans mot de passe peut en définir un directement.
    if (user.passwordHash) {
      if (!currentPassword) throw new ApiError(400, 'Mot de passe actuel requis')
      const ok = await argon2.verify(user.passwordHash, currentPassword)
      if (!ok) throw new ApiError(401, 'Mot de passe actuel incorrect', 'INVALID_CREDENTIALS')
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(newPassword) },
    })
    res.json({ message: 'Mot de passe mis à jour' })
  },
)

/** Révoque toutes les sessions (tous les appareils), y compris celle-ci. */
usersRouter.post('/me/logout-all', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  res
    .clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined })
    .json({ message: 'Déconnecté de tous les appareils' })
})

/** Suppression définitive du compte et de toutes ses données (cascade en base). */
usersRouter.delete(
  '/me',
  validateBody(deleteAccountSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(req)
    const { password } = req.body as z.infer<typeof deleteAccountSchema>

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'Utilisateur introuvable')

    if (user.passwordHash) {
      if (!password) throw new ApiError(400, 'Mot de passe requis pour supprimer le compte')
      const ok = await argon2.verify(user.passwordHash, password)
      if (!ok) throw new ApiError(401, 'Mot de passe incorrect', 'INVALID_CREDENTIALS')
    }

    await prisma.user.delete({ where: { id: userId } })
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined }).status(204).end()
  },
)
