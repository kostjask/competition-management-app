import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { legacyWorkspaceRedirect } from '../../packages/schemas/src/return-path.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
function workspaceLinks(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (!['GET', 'HEAD'].includes(req.method ?? '')) { next(); return; }
  const target = legacyWorkspaceRedirect(req.url ?? '');
  if (target) { res.writeHead(302, { Location: target, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end(); return; }
  // Vite requires its trailing base slash internally; /app is the canonical home URL.
  if (/^\/app(?:\?|$)/.test(req.url ?? '')) req.url = (req.url ?? '').replace(/^\/app(?=\?|$)/, '/app/');
  next();
}

// https://vite.dev/config/
export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss(), {
    name: 'workspace-legacy-links',
    configureServer(server) { server.middlewares.use(workspaceLinks); },
    configurePreviewServer(server) { server.middlewares.use(workspaceLinks); },
  }],
  server: {
    port: 5173,
    headers: { 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' },
    proxy: { '/api/v1': 'http://127.0.0.1:4000', '/uploads': 'http://127.0.0.1:4000' },
  },
  resolve: {
    alias: {
      '@dance/types': path.resolve(__dirname, '../../packages/types/src'),
      '@dance/schemas': path.resolve(__dirname, '../../packages/schemas/src'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@auth': path.resolve(__dirname, './src/auth'),
    },
  },
})
