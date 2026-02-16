import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    },
    hmr: {
      overlay: true
    }
  },
  publicDir: 'public',
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-pdf/renderer'],
    exclude: []
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three'],
          'pdf-vendor': ['@react-pdf/renderer']
        }
      }
    }
  }
})

