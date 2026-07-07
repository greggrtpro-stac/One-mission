import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { env } from '../config/env.js'

import { isProd } from '../config/env.js'

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

// Journal base de données : avertissements + erreurs en dev, erreurs seules en prod.
export const prisma = new PrismaClient({
  adapter,
  log: isProd ? ['error'] : ['warn', 'error'],
})
