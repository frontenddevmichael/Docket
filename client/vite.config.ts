import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2023',
    cssCodeSplit: true,
    minify: true,
    sourcemap: isProd ? 'hidden' : false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Normalize Windows backslashes to forward slashes for reliable matching
          const normalizedId = id.replace(/\\/g, '/')
          if (normalizedId.includes('/node_modules/react-dom') || normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/react-router')) return 'react-vendor'
          if (normalizedId.includes('/node_modules/framer-motion') || normalizedId.includes('/node_modules/gsap')) return 'ui-vendor'
          if (normalizedId.includes('/node_modules/react-hook-form') || normalizedId.includes('/node_modules/zod')) return 'form-vendor'
          if (normalizedId.includes('/node_modules/@tanstack/react-query')) return 'query-vendor'
          if (normalizedId.includes('/node_modules/@dnd-kit')) return 'dnd-vendor'
          if (normalizedId.includes('/node_modules/@sentry') || normalizedId.includes('/node_modules/posthog-js')) return 'monitoring'
          if (normalizedId.includes('/node_modules/lucide-react')) return 'icons'
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    chunkSizeWarningLimit: 400,
  },
})
