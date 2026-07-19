import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import net from 'node:net'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// Surchargeable pour lancer une seconde instance (worktree, tests)
// sans entrer en collision avec le serveur de dev habituel.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000'

const siteOrigin = 'https://one-mission.fr'

// Routes publiques indexables, à maintenir en phase avec App.tsx. Le tunnel
// d'authentification (/login, /register…) et l'espace connecté (/app, exclu
// aussi par robots.txt) n'ont pas vocation à apparaître dans Google.
const publicRoutes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/mentions-legales', changefreq: 'yearly', priority: '0.3' },
  { path: '/confidentialite', changefreq: 'yearly', priority: '0.3' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
]

function buildSitemapXml(): string {
  // Régénéré à chaque build : lastmod = date du build (format W3C, YYYY-MM-DD).
  const lastmod = new Date().toISOString().slice(0, 10)
  const urls = publicRoutes
    .map(
      ({ path: route, changefreq, priority }) =>
        `  <url>\n` +
        `    <loc>${siteOrigin}${route === '/' ? '/' : route}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${changefreq}</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>`,
    )
    .join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  )
}

/**
 * Émet sitemap.xml à la racine du bundle à chaque build (servi ensuite par
 * express.static depuis client/dist, donc accessible sur /sitemap.xml).
 * En dev, la même XML est servie directement pour pouvoir la contrôler.
 */
function sitemap(): Plugin {
  return {
    name: 'one-mission:sitemap',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemapXml() })
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/sitemap.xml') return next()
        res.setHeader('Content-Type', 'application/xml; charset=utf-8')
        res.end(buildSitemapXml())
      })
    },
  }
}

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
  plugins: [react(), tailwindcss(), waitForBackend(), sitemap()],
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
