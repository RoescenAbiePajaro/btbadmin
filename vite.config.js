// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // This ensures assets are loaded from root
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://btbtestservice.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
})