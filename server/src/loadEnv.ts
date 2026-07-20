import path from 'node:path'
import { config as loadEnv } from 'dotenv'

// Charge <repo>/.env dans process.env SANS écraser les variables déjà
// définies. Résout depuis server/src (dev, tsx) comme depuis server/dist
// (prod, node) : même profondeur. En dev, tsx --env-file a déjà tout chargé
// et cet appel ne change rien ; en production, c'est ici que la
// configuration arrive, quel que soit le lanceur ou le cwd.
// dotenv plutôt que process.loadEnvFile : cette API de node:process n'est
// pas disponible sur toutes les versions de Node malgré engines >=20.19
// (constaté en prod — l'appel levait, sans être rattrapé, et empêchait le
// serveur de démarrer). dotenv ne lève jamais si le fichier est absent.
const envFile = path.resolve(import.meta.dirname, '../../.env')
loadEnv({ path: envFile, quiet: true })
