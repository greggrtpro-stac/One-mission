import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`🎯 One Mission API prête sur http://localhost:${env.PORT}`)
})
