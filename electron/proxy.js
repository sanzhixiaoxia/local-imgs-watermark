/**
 * 图片 CORS 代理，逻辑与 vite.config.ts 中的 image-cors-proxy 保持一致。
 * 供 Electron 主进程本地服务器使用，用于加载微信等带防盗链 / CORS 限制的图片。
 */
function createImageProxy() {
  return async (req, res, _next) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const targetUrl = reqUrl.searchParams.get('url')
    if (!targetUrl) {
      res.statusCode = 400
      res.end('Missing url parameter')
      return
    }

    // 上游微信图偶发连接抖动，失败时自动重试（单次 20s，共 3 次）
    let response = null
    let lastErr = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      try {
        response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            Referer: new URL(targetUrl).origin,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        })
        clearTimeout(timeout)
        if (response.ok) break
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

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/png'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(buffer)
  }
}

module.exports = { createImageProxy }