import type { SessionInfo } from '@one-mission/shared'
import type { Request, Response } from 'express'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env, isProd } from '../../config/env.js'
import {
  blockedForSeconds,
  delayForMs,
  recordFailure,
  recordSuccess,
  sleep,
} from '../../lib/authThrottle.js'
import { signAccessToken } from '../../lib/jwt.js'
import { log } from '../../lib/log.js'
import { locationFromIp, parseUserAgent } from '../../lib/userAgent.js'
import { getUserId, requireAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { requireTurnstile } from '../../middleware/turnstile.js'
import { validateBody } from '../../middleware/validate.js'
import { toPublicUser } from '../users/users.mapper.js'
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas.js'
import * as auth from './auth.service.js'
import { resendVerification, verifyEmail } from './verification.service.js'

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

// ── Rate limiting ────────────────────────────────────────────
// Filet global sur tout /api/auth, puis limites serrées par route sensible.
// En complément, authThrottle ralentit puis bloque les IP qui enchaînent
// les échecs de connexion (voir /login ci-dessous). Cloudflare Turnstile
// (requireTurnstile) filtre en amont les robots sur les routes sensibles —
// jamais sur la seule foi du frontend, toujours revérifié ici côté serveur.

const limiterDefaults = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
} as const

authRouter.use(
  rateLimit({
    ...limiterDefaults,
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: { error: 'Trop de tentatives, réessaie dans quelques minutes' },
  }),
)

const loginLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Trop de tentatives de connexion, réessaie dans 15 minutes' },
})

const registerLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: { error: "Trop de créations de compte depuis cette adresse, réessaie plus tard" },
})

const forgotPasswordLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { error: 'Trop de demandes de réinitialisation, réessaie dans une heure' },
})

const resetPasswordLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: { error: 'Trop de tentatives, réessaie plus tard' },
})

const resendVerificationLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { error: 'Trop de demandes de renvoi, réessaie dans une heure' },
})

// ── Inscription / connexion ──────────────────────────────────

authRouter.post(
  '/register',
  registerLimiter,
  validateBody(registerSchema),
  requireTurnstile(),
  async (req: Request, res: Response) => {
    const user = await auth.register(req.body)
    log('info', 'auth.register', { userId: user.id })
    // Aucune session : le compte reste inutilisable tant que l'e-mail n'est
    // pas confirmé (voir auth.service.ts#login). Le client affiche l'écran
    // « e-mail envoyé » à partir de cette seule adresse.
    res.status(201).json({
      email: user.email,
      message:
        'Ton compte a été créé avec succès. Un e-mail de confirmation vient de t’être envoyé.',
    })
  },
)

authRouter.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  requireTurnstile(),
  async (req: Request, res: Response) => {
    const ip = req.ip ?? 'inconnue'

    // IP bloquée après trop d'échecs : refus immédiat, sans toucher à la base.
    const blockedFor = blockedForSeconds(ip)
    if (blockedFor !== null) {
      res.setHeader('Retry-After', String(blockedFor))
      throw new ApiError(
        429,
        `Trop de tentatives échouées. Réessaie dans ${Math.max(1, Math.ceil(blockedFor / 60))} min.`,
        'TOO_MANY_ATTEMPTS',
      )
    }

    // Ralentissement progressif : chaque échec récent renchérit la tentative.
    const delay = delayForMs(ip)
    if (delay > 0) await sleep(delay)

    try {
      const user = await auth.login(req.body)
      recordSuccess(ip)
      log('info', 'auth.login', { userId: user.id })
      await sendSession(req, res, user.id, user)
    } catch (err) {
      // Signal de sécurité : les échecs de connexion sont journalisés (sans
      // l'identifiant saisi — pas de donnée personnelle dans les logs).
      // Un 403 EMAIL_NOT_VERIFIED n'est PAS un échec d'authentification (le
      // mot de passe était correct) : il ne compte pas dans le throttle.
      if (err instanceof ApiError && err.status === 401) {
        recordFailure(ip)
        log('warn', 'auth.login.failed', { ip })
      }
      throw err
    }
  },
)

authRouter.post('/google', validateBody(googleAuthSchema), async (req: Request, res: Response) => {
  const user = await auth.googleAuth(req.body.credential)
  await sendSession(req, res, user.id, user)
})

/** Le client web lit l'id public Google ici (pas de secret exposé). */
authRouter.get('/google/client-id', (_req, res) => {
  res.json({ clientId: env.GOOGLE_CLIENT_ID || null })
})

/** Le client web lit la clé de site Turnstile ici (le secret ne quitte jamais le serveur). */
authRouter.get('/turnstile/site-key', (_req, res) => {
  res.json({ siteKey: env.TURNSTILE_SITE_KEY || null })
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
  if (raw) {
    await auth.revokeRefreshToken(raw)
    log('info', 'auth.logout', {})
  }
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined }).status(204).end()
})

// ── Réinitialisation de mot de passe ─────────────────────────

authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  requireTurnstile(),
  async (req: Request, res: Response) => {
    await auth.requestPasswordReset(req.body.email)
    // Réponse identique que le compte existe ou non : pas d'énumération.
    res.json({ message: 'Si un compte existe avec cet e-mail, un lien a été envoyé.' })
  },
)

authRouter.post(
  '/reset-password',
  resetPasswordLimiter,
  validateBody(resetPasswordSchema),
  async (req: Request, res: Response) => {
    await auth.resetPassword(req.body.token, req.body.password)
    res.json({ message: 'Mot de passe mis à jour, tu peux te connecter.' })
  },
)

// ── Vérification d'e-mail (obligatoire pour se connecter) ────

authRouter.post(
  '/verify-email',
  resetPasswordLimiter,
  validateBody(verifyEmailSchema),
  async (req: Request, res: Response) => {
    const status = await verifyEmail(req.body.token, req.body.uid)
    res.json({ status })
  },
)

authRouter.post(
  '/resend-verification',
  resendVerificationLimiter,
  validateBody(resendVerificationSchema),
  requireTurnstile(),
  async (req: Request, res: Response) => {
    await resendVerification(req.body.email)
    // Réponse identique que le compte existe, soit déjà vérifié ou non : pas d'énumération.
    res.json({
      message: 'Si ce compte existe et n’est pas encore vérifié, un e-mail vient d’être envoyé.',
    })
  },
)
