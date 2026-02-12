import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/socket.io': {
        target: 'http://talks-server:4000',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/auth': {
        target: 'http://talks-server:4000',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://talks-server:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
