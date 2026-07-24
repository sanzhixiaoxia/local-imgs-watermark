import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Connect } from 'vite'

/**
 * 图片 CORS 代理中间件：用于加载微信等带防盗链 / CORS 限制的图片。
 * 同时挂载到 dev server 与 preview server，确保两种运行方式都能代理。
 */
function createImageProxy(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const reqUrl = new URL(req.url!, `http://${req.headers.host}`)
    const targetUrl = reqUrl.searchParams.get('url')
    if (!targetUrl) {
      res.statusCode = 400
      res.end('Missing url parameter')
      return
    }

    // 上游微信图偶发连接抖动，失败时自动重试以消除偶发 500（单次 20s，共 3 次，最长 60s）
    let response: Response | null = null
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      try {
        response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'Referer': new URL(targetUrl).origin,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        })
        clearTimeout(timeout)
        if (response.ok) break
        // 非 2xx 也计入失败并重试（最后一次仍失败则按上游状态返回）
      } catch (err) {
        lastErr = err
        clearTimeout(timeout)
      }
    }

    if (!response) {
      res.statusCode = 502
      res.end(`Upstream unavailable: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`)
      return
    }
    if (!response.ok) {
      res.statusCode = response.status
      res.end(`Upstream error: ${response.status}`)
      return
    }

      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'image/png'
      res.setHeader('Content-Type', contentType)
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.end(Buffer.from(buffer))
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'image-cors-proxy',
      configureServer(server) {
        const base = server.config.base || '/'
        const mountPath = (base.endsWith('/') ? base : base + '/') + 'api/image-proxy'
        server.middlewares.use(mountPath, createImageProxy())
      },
      configurePreviewServer(server) {
        const base = server.config.base || '/'
        const mountPath = (base.endsWith('/') ? base : base + '/') + 'api/image-proxy'
        server.middlewares.use(mountPath, createImageProxy())
      },
    },
  ],
  base: '/local-imgs-watermark/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
