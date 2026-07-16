import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import net from 'node:net'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// Surchargeable pour lancer une seconde instance (worktree, tests)
// sans entrer en collision avec le serveur de dev habituel.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000'

/**
 * Au lancement (`npm run dev`), Vite est prêt avant Express : les premières
 * requêtes /api partent dans le vide et remplissent la console d'ECONNREFUSED.
 * Ce middleware retient chaque requête /api jusqu'à ce que le port du backend
 * accepte les connexions (30 s max), puis s'efface : une fois le backend vu
 * prêt une fois, plus aucune sonde — comportement strictement identique.
 */
function waitForBackend(): Plugin {
  const { hostname, port } = new URL(proxyTarget)

  const probe = () =>
    new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: hostname, port: Number(port) })
      socket.once('connect', () => {
        socket.end()
        resolve(true)
      })
      socket.once('error', () => resolve(false))
      socket.setTimeout(1_000, () => {
        socket.destroy()
        resolve(false)
      })
    })

  let ready = false
  return {
    name: 'one-mission:wait-for-backend',
    apply: 'serve',
    configureServer(server) {
      // Enregistré dans configureServer : passe AVANT le proxy interne de Vite.
      server.middlewares.use(async (req, _res, next) => {
        if (ready || !req.url?.startsWith('/api')) return next()
        const deadline = Date.now() + 30_000
        while (Date.now() < deadline) {
          if (await probe()) {
            ready = true
            return next()
          }
          await new Promise((r) => setTimeout(r, 250))
        }
        // Délai dépassé : on laisse le proxy remonter l'erreur réelle.
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), waitForBackend()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    // Échoue si 5173 est pris plutôt que de basculer en silence sur 5174
    // (sinon le navigateur pointe sur une vieille instance et rien ne s'affiche).
    strictPort: true,
    proxy: {
      '/api': proxyTarget,
    },
  },
})
