import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
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
