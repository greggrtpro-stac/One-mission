import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Le .env vit à la racine du monorepo ; il peut être absent (CI, premier clone).
// dotenv (plutôt que process.loadEnvFile, indisponible sur certaines versions
// de Node malgré engines >=20.19 — constaté en prod) : ne lève jamais si le
// fichier est absent, et n'écrase pas les variables déjà présentes.
loadEnv({ path: path.join(import.meta.dirname, '../.env'), quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
