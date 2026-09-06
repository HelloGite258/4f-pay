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
  },
})
