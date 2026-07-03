import { Router } from 'express'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter } from './modules/users/users.routes.js'

/** Routeur principal : chaque module métier vient s'y brancher. */
export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'One Mission API', uptime: Math.round(process.uptime()) })
})

apiRouter.use('/auth', authRouter)
apiRouter.use('/users', usersRouter)
