import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tmdbHandler from './api/tmdb.js'

// In `npm run dev`, serve /api/tmdb with the same handler Vercel runs in
// production, reading TMDB_TOKEN from your local .env (never bundled).
function tmdbDevProxy() {
  return {
    name: 'tmdb-dev-proxy',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      if (env.TMDB_TOKEN) process.env.TMDB_TOKEN ??= env.TMDB_TOKEN
      if (env.VITE_TMDB_TOKEN) process.env.VITE_TMDB_TOKEN ??= env.VITE_TMDB_TOKEN
      server.middlewares.use('/api/tmdb', (req, res) => {
        req.url = '/api/tmdb' + req.url // middleware strips the mount path
        tmdbHandler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tmdbDevProxy()],
})
