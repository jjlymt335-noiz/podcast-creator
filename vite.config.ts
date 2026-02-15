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
        // 音效生成需要 10-30 秒，必须设置足够长的超时
        '/audiox': {
          target: env.VITE_AUDIOX_SERVER_URL || 'http://34.64.86.14:8000',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/audiox/, ''),
          timeout: 300000,
          proxyTimeout: 300000,
          configure: (proxy: any) => {
            proxy.on('error', (err: any, _req: any, res: any) => {
              console.error('[audiox proxy] error:', err.code, err.message);
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `Proxy error: ${err.message}`, code: err.code }));
              }
            });
            proxy.on('proxyReq', (_proxyReq: any, req: any) => {
              console.log('[audiox proxy] →', req.method, req.url);
              req.socket.setTimeout(300000);
            });
            proxy.on('proxyRes', (proxyRes: any, req: any) => {
              console.log('[audiox proxy] ←', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
  }
})
