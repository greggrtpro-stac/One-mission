import fs from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Le .env vit à la racine du monorepo. dotenv (plutôt que process.loadEnvFile,
// indisponible sur certaines versions de Node malgré engines >=20.19 —
// constaté en prod) : n'écrase pas les variables déjà présentes dans
// process.env (ex. définies par le gestionnaire de process en prod).
const envPath = path.join(import.meta.dirname, '../.env')
loadEnv({ path: envPath, quiet: true })

// Échec explicite plutôt qu'une URL vide silencieuse : une datasource vide
// produit une erreur Prisma générique ("invalid database string") qui ne dit
// pas QUEL fichier a été cherché ni s'il existe — impossible à diagnostiquer
// à distance. Ce message donne directement la réponse.
if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL est introuvable après chargement de l'environnement.\n` +
      `  Fichier .env recherché : ${envPath}\n` +
      `  Ce fichier existe ${fs.existsSync(envPath) ? '' : 'PAS '}(existsSync: ${fs.existsSync(envPath)}).\n` +
      `  Si le fichier existe : vérifier qu'il contient bien une ligne DATABASE_URL=...\n` +
      `  non commentée, sans guillemets cassés, encodée en UTF-8 sans BOM.`,
  )
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
