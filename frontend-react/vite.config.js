import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,              // listen ke 0.0.0.0
    port: 5173,              // pastikan sesuai dengan PM2 dan Nginx
    allowedHosts: ["sentaraai.oke.com"],

    proxy: {
      '/api': {
        target: 'https://sentara.oke.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
