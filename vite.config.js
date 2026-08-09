import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
    allowedHosts: [
      'brick-informed-walks-surge.trycloudflare.com',
      '.trycloudflare.com',
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:9001',
        changeOrigin: true,
      },
    },
  },
})
