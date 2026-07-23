import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'image-cors-proxy',
      configureServer(server) {
        const base = server.config.base || '/'
        const mountPath = (base.endsWith('/') ? base : base + '/') + 'api/image-proxy'
        server.middlewares.use(mountPath, async (req, res) => {
          const reqUrl = new URL(req.url!, `http://${req.headers.host}`)
          const targetUrl = reqUrl.searchParams.get('url')
          if (!targetUrl) {
            res.statusCode = 400
            res.end('Missing url parameter')
            return
          }

          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 15000)

            const response = await fetch(targetUrl, {
              signal: controller.signal,
              headers: {
                'Referer': new URL(targetUrl).origin,
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            })
            clearTimeout(timeout)

            if (!response.ok) {
              res.statusCode = response.status
              res.end(`Upstream error: ${response.status}`)
              return
            }

            const buffer = await response.arrayBuffer()
            const contentType =
              response.headers.get('content-type') || 'image/png'
            res.setHeader('Content-Type', contentType)
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader(
              'Cache-Control',
              'public, max-age=3600',
            )
            res.end(Buffer.from(buffer))
          } catch (err: any) {
            res.statusCode = 500
            res.end(`Proxy error: ${err.message}`)
          }
        })
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
