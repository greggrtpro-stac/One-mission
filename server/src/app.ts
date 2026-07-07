import fs from 'node:fs'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env, isProd } from './config/env.js'
import { log } from './lib/log.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { apiRouter } from './routes.js'

/**
 * Hash CSP du seul script inline restant (le garde-fou file:// de
 * client/index.html). Il n'a d'utilité que quand la page N'EST PAS servie par
 * un serveur : si son contenu change un jour et que le hash ne correspond
 * plus, le garde est simplement ignoré en production — sans autre effet.
 */
const FILE_GUARD_SCRIPT_HASH = "'sha256-bblu40LfPD5YEHR26irU8ZCC/LkBmTjHbebdFn6AY6k='"

// Le client construit — servi par ce serveur en production (hébergement Node
// mono-processus type Hostinger). Résout vers <repo>/client/dist depuis
// server/src (dev, tsx) comme depuis server/dist (prod, node).
const clientDist = path.resolve(import.meta.dirname, '../../client/dist')

export function createApp() {
  const app = express()

  // Derrière un reverse proxy (hébergement en production), l'IP réelle du
  // client arrive dans X-Forwarded-For : sans ce réglage, le rate limiting et
  // les sessions « Appareils connectés » verraient l'IP du proxy pour tout le
  // monde. 1 = un seul saut de proxy de confiance.
  if (isProd) app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // accounts.google.com : bouton « Continuer avec Google » (chargé au clic).
          scriptSrc: ["'self'", FILE_GUARD_SCRIPT_HASH, 'https://accounts.google.com'],
          connectSrc: ["'self'", 'https://accounts.google.com'],
          frameSrc: ['https://accounts.google.com'],
          // data: pour les avatars importés ; googleusercontent pour les photos Google.
          imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
          // 'unsafe-inline' : styles inline posés par framer-motion et le bouton Google.
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"], // anti-clickjacking
        },
      },
    }),
  )
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())

  // Journal des requêtes — détaillé en développement, coupé en production.
  if (!isProd) {
    app.use((req, res, next) => {
      const startedAt = Date.now()
      res.on('finish', () => {
        log('debug', 'http', {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          ms: Date.now() - startedAt,
        })
      })
      next()
    })
  }

  app.use('/api', apiRouter)

  // En production, ce serveur sert aussi le client construit : assets avec
  // cache long (noms hachés par Vite), index.html jamais mis en cache, et
  // toute route non-API renvoie l'application (routage côté client).
  if (isProd && fs.existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders: (res, filePath) => {
          const immutable = filePath.includes(`${path.sep}assets${path.sep}`)
          res.setHeader(
            'Cache-Control',
            immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
          )
        },
      }),
    )
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
