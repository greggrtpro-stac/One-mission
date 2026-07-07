import type { SessionInfo } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env, isProd } from '../../config/env.js'
import { signAccessToken } from '../../lib/jwt.js'
import { locationFromIp, parseUserAgent } from '../../lib/userAgent.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { validateBody } from '../../middleware/validate.js'
import { toPublicUser } from '../users/users.mapper.js'
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas.js'
import * as auth from './auth.service.js'

export const REFRESH_COOKIE = 'om_refresh'

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

/** Métadonnées d'appareil attachées à la session (écran « Appareils connectés »). */
function sessionMeta(req: Request): auth.SessionMeta {
  return { userAgent: req.get('user-agent') ?? null, ip: req.ip ?? null }
}

async function sendSession(req: Request, res: Response, userId: string, user: Awaited<ReturnType<typeof auth.login>>, status = 200) {
  const refreshToken = await auth.issueRefreshToken(userId, sessionMeta(req))
  res
    .status(status)
    .cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions)
    .json({ user: toPublicUser(user), accessToken: signAccessToken(userId) })
}

export const authRouter = Router()

// Limite les tentatives d'authentification (force brute).
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Trop de tentatives, réessaie dans quelques minutes' },
  }),
)

authRouter.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const user = await auth.register(req.body)
  await sendSession(req, res, user.id, user, 201)
})

authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const user = await auth.login(req.body)
  await sendSession(req, res, user.id, user)
})

authRouter.post('/google', validateBody(googleAuthSchema), async (req: Request, res: Response) => {
  const user = await auth.googleAuth(req.body.credential)
  await sendSession(req, res, user.id, user)
})

/** Le client web lit l'id public Google ici (pas de secret exposé). */
authRouter.get('/google/client-id', (_req, res) => {
  res.json({ clientId: env.GOOGLE_CLIENT_ID || null })
})

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
  if (!raw) {
    res.status(401).json({ error: 'Aucune session', code: 'NO_SESSION' })
    return
  }
  const { user, refreshToken, accessToken } = await auth.rotateRefreshToken(raw, sessionMeta(req))
  res
    .cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions)
    .json({ user: toPublicUser(user), accessToken })
})

// ── Appareils connectés ──────────────────────────────────────
// Sous /api/auth car le cookie refresh (path /api/auth) identifie la session courante.

authRouter.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
  const [rows, currentFamilyId] = await Promise.all([
    auth.listActiveSessions(userId),
    raw ? auth.findSessionFamilyByToken(raw) : Promise.resolve(null),
  ])

  const sessions: SessionInfo[] = rows.map((row) => ({
    id: row.familyId,
    ...parseUserAgent(row.userAgent),
    location: locationFromIp(row.ip),
    connectedAt: row.connectedAt.toISOString(),
    lastActivityAt: row.lastUsedAt.toISOString(),
    isCurrent: row.familyId === currentFamilyId,
  }))
  res.json({ sessions })
})

authRouter.delete('/sessions/:familyId', requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const familyId = req.params.familyId as string

  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
  const currentFamilyId = raw ? await auth.findSessionFamilyByToken(raw) : null

  const revoked = await auth.revokeSessionFamily(userId, familyId)
  if (!revoked) throw new ApiError(404, 'Session introuvable ou déjà fermée', 'SESSION_NOT_FOUND')

  // Déconnexion de l'appareil courant : le cookie de ce navigateur est effacé.
  if (familyId === currentFamilyId) {
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined })
  }
  res.status(204).end()
})

authRouter.post('/logout', async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
  if (raw) await auth.revokeRefreshToken(raw)
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined }).status(204).end()
})

authRouter.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    await auth.requestPasswordReset(req.body.email)
    res.json({ message: 'Si un compte existe avec cet e-mail, un lien a été envoyé.' })
  },
)

authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  async (req: Request, res: Response) => {
    await auth.resetPassword(req.body.token, req.body.password)
    res.json({ message: 'Mot de passe mis à jour, tu peux te connecter.' })
  },
)
