import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

function normalizeViteBasePath(value = '/') {
  const trimmed = String(value || '/').trim()
  if (!trimmed || trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3000'
  const publicBasePath = env.VITE_PUBLIC_BASE_PATH || '/'
  
  return {
    base: normalizeViteBasePath(publicBasePath),
    plugins: [vue()],
    server: {
      host: '0.0.0.0', // 允许所有网络接口访问
      port: 5173,
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true
        }
      }
    }
  }
})
