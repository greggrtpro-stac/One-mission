// Build de production : bundle le serveur en un seul fichier dist/index.js
// exécutable par node seul (sans tsx). Les paquets node_modules restent
// externes (résolus à l'exécution) ; @one-mission/shared — qui n'expose que
// du TypeScript brut, illisible par node — est inclus dans le bundle via
// l'alias ci-dessous. Le client Prisma généré (src/generated) est du
// TypeScript pur qui n'importe que @prisma/client/runtime : il se bundle
// sans fichier annexe.
import { rmSync } from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'

const serverDir = path.resolve(import.meta.dirname, '..')

rmSync(path.join(serverDir, 'dist'), { recursive: true, force: true })

await build({
  entryPoints: [path.join(serverDir, 'src', 'index.ts')],
  outfile: path.join(serverDir, 'dist', 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  alias: {
    '@one-mission/shared': path.resolve(serverDir, '..', 'shared', 'src', 'index.ts'),
  },
  sourcemap: true,
  logLevel: 'info',
})
