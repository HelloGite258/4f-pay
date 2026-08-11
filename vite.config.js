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
      // 开发环境代理通道二维码图，便于 canvas 解码（避免跨域污染）
      '/xlcloud-img': {
        target: 'https://xapi.xlcloudpay.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/xlcloud-img/, ''),
      },
    },
  },
})
