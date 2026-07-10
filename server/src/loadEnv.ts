import fs from 'node:fs'
import path from 'node:path'

// Charge <repo>/.env dans process.env SANS écraser les variables déjà
// définies (même sémantique que node --env-file). Résout depuis server/src
// (dev, tsx) comme depuis server/dist (prod, node) : même profondeur.
// En dev, tsx --env-file a déjà tout chargé et ce fichier ne change rien ;
// en production (Hostinger), c'est ici que la configuration arrive, quel
// que soit le lanceur (npm start, fichier de démarrage hPanel) ou le cwd.
const envFile = path.resolve(import.meta.dirname, '../../.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)
