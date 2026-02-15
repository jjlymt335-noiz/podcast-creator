import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        // /api/v1/ 内部接口需要 cookie 认证（emotion-enhance, voice-design 等）
        '/api': {
          target: 'https://noiz.ai',
          changeOrigin: true,
          secure: true,
          headers: {
            cookie: `access_token=${env.VITE_ACCESS_TOKEN || ''}`,
          },
        },
        // AudioX T2S GPU 服务（远程服务端点无 /audiox 前缀，需 rewrite）
        '/audiox': {
          target: env.VITE_AUDIOX_SERVER_URL || 'http://34.64.86.14:8000',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/audiox/, ''),
        },
      },
    },
  }
})
