import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { blogPrerenderPlugin } from './vite-plugin-blog-prerender'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), blogPrerenderPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
