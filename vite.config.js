import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:9099'

  return {
    plugins: [vue()],
    server: {
      port: 5173,
      open: true,
      allowedHosts: [
        'brick-informed-walks-surge.trycloudflare.com',
        '.trycloudflare.com',
      ],
      proxy: {
        '/sifang-api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
