import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'logo.png',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'wasm/ort-wasm-simd-threaded.wasm',
        'wasm/ort-wasm-simd-threaded.mjs',
      ],
      manifest: {
        name: 'Anjana Connects',
        short_name: 'Anjana Connects',
        description: 'Staff, Attendance & Biometric Management System for HP Gas Agency',
        theme_color: '#123B72',
        background_color: '#F7F7F5',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,mjs}'],
        // Allow caching of the ONNX Runtime WASM binary
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // NEVER cache any authenticated / dynamic API requests
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
          {
            // Cache static ONNX models with StaleWhileRevalidate
            urlPattern: ({ url }) => url.pathname.startsWith('/models/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'onnx-models-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'onnxruntime-web': 'onnxruntime-web/wasm',
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
