import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const srcDir = path.dirname(fileURLToPath(import.meta.url)) + '/src'

export default defineConfig(({ mode }) => {
  // Same variable as the production nginx proxy. Point it at a local backend
  // (e.g. BACKEND_URL=http://localhost:4000) to develop against it.
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.BACKEND_URL || 'https://hackathon-backend.makonew.com'

  // The backend rejects cross-origin browser requests, so we proxy API traffic
  // through the dev/preview server. That makes every request same-origin.
  const proxy = {
    '/auth': { target: backend, changeOrigin: true, secure: true },
    '/llm': { target: backend, changeOrigin: true, secure: true },
    '/health': { target: backend, changeOrigin: true, secure: true },
    '/content': { target: backend, changeOrigin: true, secure: true },
    '/contact': { target: backend, changeOrigin: true, secure: true },
    '/api/assistant': { target: backend, changeOrigin: true, secure: true },
    '/innovations': { target: backend, changeOrigin: true, secure: true },
    '/api/v1': { target: backend, changeOrigin: true, secure: true },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': srcDir,
      },
    },
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
