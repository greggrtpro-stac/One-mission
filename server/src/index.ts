import { createApp } from './app.js'
import { env } from './config/env.js'
import { startDailyQuestReset } from './jobs/daily-reset.js'

const app = createApp()

// `exclusive` force SO_EXCLUSIVEADDRUSE sous Windows : sans lui, deux serveurs
// peuvent se lier au même port en silence et l'ancien vole les requêtes du
// nouveau (symptôme : l'API sert du code périmé, le front semble cassé).
const server = app.listen({ port: env.PORT, exclusive: true }, () => {
  console.log(`🎯 One Mission API prête sur http://localhost:${env.PORT}`)
  startDailyQuestReset()
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
    console.error(
      `❌ Le port ${env.PORT} est déjà utilisé par un autre processus.\n` +
        `   Ferme l'autre serveur (ou trouve-le avec : Get-NetTCPConnection -LocalPort ${env.PORT}) puis relance.`,
    )
    process.exit(1)
  }
  throw err
})
