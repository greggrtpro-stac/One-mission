import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env, isProd } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { apiRouter } from './routes.js'

export function createApp() {
  const app = express()

  // Derrière un reverse proxy (hébergement en production), l'IP réelle du
  // client arrive dans X-Forwarded-For : sans ce réglage, le rate limiting et
  // les sessions « Appareils connectés » verraient l'IP du proxy pour tout le
  // monde. 1 = un seul saut de proxy de confiance.
  if (isProd) app.set('trust proxy', 1)

  app.use(helmet())
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
