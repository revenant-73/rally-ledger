import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env': {},
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rally Ledger',
        short_name: 'RallyLedger',
        description: 'Live volleyball match tracking and decision-support app',
        theme_color: '#16171d',
        icons: [
          {
            src: 'app_icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'app_icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'app_icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
