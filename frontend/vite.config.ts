import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { proxy: { '/api': { target: process.env.CUADERNO_API_TARGET || 'http://127.0.0.1:8080' } } },
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    workbox: { navigateFallbackDenylist: [/^\/api\//] },
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'Cuaderno — Organiza tu día',
      short_name: 'Cuaderno',
      description: 'Un espacio tranquilo para organizar tus días.',
      theme_color: '#dcdad4',
      background_color: '#dcdad4',
      display: 'standalone',
      start_url: '/',
      icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
  })],
})
