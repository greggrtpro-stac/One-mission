import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
      '/api': 'http://localhost:4000',
    },
  },
})
