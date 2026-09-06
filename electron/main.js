const { app, BrowserWindow } = require('electron')
const http = require('http')
const path = require('path')
const fs = require('fs')
const { createImageProxy } = require('./proxy')

const isDev = !!process.env.VITE_DEV_SERVER_URL
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000'
const BASE = '/local-imgs-watermark/'

let mainWindow = null
let server = null

/**
 * 生产模式下，在本地启动一个 HTTP 服务器：
 *   1) 托管 Vite 构建产物（dist/），作为前端页面来源
 *   2) 提供 /api/image-proxy，复用图片代理逻辑
 * 这样渲染进程的原有请求（BASE + api/image-proxy）无需改动即可工作。
 */
function startProdServer() {
  return new Promise((resolve) => {
    const distDir = path.join(__dirname, '..', 'dist')
    const proxy = createImageProxy()

    server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://${req.headers.host}`)
      // 图片代理
      if (reqUrl.pathname.replace(/\/+$/, '').endsWith('/api/image-proxy')) {
        return proxy(req, res, () => {})
      }
      // 静态资源：剥离 BASE 前缀后从 dist 读取
      let pathname = decodeURIComponent(reqUrl.pathname)
      if (pathname.startsWith(BASE)) pathname = pathname.slice(BASE.length)
      if (pathname === '/' || pathname === '') pathname = '/index.html'
      const filePath = path.join(distDir, pathname)
      if (!filePath.startsWith(distDir)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404
          res.end('Not Found')
          return
        }
        res.setHeader('Content-Type', contentTypeFor(filePath))
        res.end(data)
      })
    })

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      resolve(`http://127.0.0.1:${port}${BASE}`)
    })
  })
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json',
  }
  return map[ext] || 'application/octet-stream'
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    await mainWindow.loadURL(DEV_URL + BASE)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const url = await startProdServer()
    await mainWindow.loadURL(url)
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (server) server.close()
  if (process.platform !== 'darwin') app.quit()
})