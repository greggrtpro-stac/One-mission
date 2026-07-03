import path from 'node:path'
import { loadEnvFile } from 'node:process'
import { defineConfig } from 'prisma/config'

// Le .env vit à la racine du monorepo ; il peut être absent (CI, premier clone).
try {
  loadEnvFile(path.join(import.meta.dirname, '../.env'))
} catch {
  /* variables déjà présentes dans l'environnement */
}

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
