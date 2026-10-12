import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { mockApi } from './mock/api.ts'

// 纯前端开发时由 mock 中间件接管 /api；设 MOCK_API=false 改走真实后端代理
const useMockApi = process.env.MOCK_API !== 'false'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), ...(useMockApi ? [mockApi()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // 产物输出到 Go 模块内，由 internal/webassets 嵌入二进制
    outDir: '../internal/webassets/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: useMockApi
      ? undefined
      : {
          '/api': {
            target: 'http://127.0.0.1:8080',
            changeOrigin: true,
          },
        },
  },
})
