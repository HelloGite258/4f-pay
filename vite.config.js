import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 4f-api: server.port=9099, context-path=/sifang-api
const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:9099'

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
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => `/sifang-api${path}`,
      },
    },
  },
})
