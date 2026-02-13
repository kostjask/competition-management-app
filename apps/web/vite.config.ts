import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
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
