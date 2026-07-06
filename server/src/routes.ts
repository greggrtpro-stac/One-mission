import { Router } from 'express'
import { addictionsRouter } from './modules/addictions/addictions.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { deepworkRouter } from './modules/deepwork/deepwork.routes.js'
import { journalRouter } from './modules/journal/journal.routes.js'
import { leaderboardRouter } from './modules/leaderboard/leaderboard.routes.js'
import { mainQuestRouter } from './modules/main-quest/main-quest.routes.js'
import { planningRouter } from './modules/planning/planning.routes.js'
import { questsRouter } from './modules/quests/quests.routes.js'
import { statsRouter } from './modules/stats/stats.routes.js'
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { weeklyRouter } from './modules/weekly-quests/weekly.routes.js'

/** Routeur principal : chaque module métier vient s'y brancher. */
export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'One Mission API', uptime: Math.round(process.uptime()) })
})

apiRouter.use('/auth', authRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/quests', questsRouter)
apiRouter.use('/main-quest', mainQuestRouter)
apiRouter.use('/weekly-quests', weeklyRouter)
apiRouter.use('/planning', planningRouter)
apiRouter.use('/dashboard', dashboardRouter)
apiRouter.use('/deepwork', deepworkRouter)
apiRouter.use('/addictions', addictionsRouter)
apiRouter.use('/journal', journalRouter)
apiRouter.use('/leaderboard', leaderboardRouter)
apiRouter.use('/stats', statsRouter)
apiRouter.use('/subscriptions', subscriptionsRouter)
