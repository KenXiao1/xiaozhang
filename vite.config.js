import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('katex')) return 'katex'
          if (id.includes('@supabase')) return 'supabase'
        }
      }
    }
  }
})
