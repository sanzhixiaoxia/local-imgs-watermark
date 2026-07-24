import { useState, useEffect } from 'react'
import Header from './components/Header'
import ImageUpload from './components/ImageUpload'
import WatermarkConfig from './components/WatermarkConfig'
import Preview from './components/Preview'
import { WatermarkSettings } from './types'
import { useToast } from './components/Toast'

const DEFAULT_SETTINGS: WatermarkSettings = {
  type: 'text',
  text: '东莞市炬烨塑胶科技有限公司',
  fontSize: 24,
  color: '#ffffff',
  opacity: 0.3,
  rotation: -30,
  position: 'middle-center',
  offsetX: 20,
  offsetY: 20,
  tile: false,
  tileSpacingX: 1.5,
  tileSpacingY: 2,
  watermarkImage: null,
}

const STORAGE_KEY = 'watermark-settings'

// 已知有 CORS 限制的域名（加载图片时需要通过代理）
const CORS_RESTRICTED_DOMAINS = [
  'mmbiz.qpic.cn',
  'mmbiz.qlogo.cn',
  'mp.weixin.qq.com',
]

function isCorsRestrictedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return CORS_RESTRICTED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d),
    )
  } catch {
    return false
  }
}

function getProxyUrl(originalUrl: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}api/image-proxy?url=${encodeURIComponent(originalUrl)}`
}

/** 将图片 blob 转为 File 对象 */
function imageUrlToFile(blob: Blob, sourceUrl: string): File {
  const fileName =
    sourceUrl.split('/').pop()?.split('?')[0] || 'pasted-image.png'
  return new File([blob], fileName, { type: blob.type || 'image/png' })
}

/** 尝试直接加载（带 crossOrigin），成功时返回 File */
function tryLoadDirect(url: string): Promise<File | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'

    const done = (file: File | null) => {
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
      resolve(file)
    }

    const onLoad = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return done(null)
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            done(blob ? imageUrlToFile(blob, url) : null)
          },
          'image/png',
        )
      } catch {
        done(null)
      }
    }

    const onError = () => done(null)

    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)
    img.src = url
  })
}

/** 通过本地代理加载图片 */
async function loadViaProxy(url: string): Promise<File | null> {
  try {
    const proxyUrl = getProxyUrl(url)
    const response = await fetch(proxyUrl, {
      headers: {
        Referer: new URL(url).origin,
      },
    })
    if (!response.ok) return null
    // 防止代理端点被 SPA fallback 命中（返回 HTML）时误判为成功
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return null
    const blob = await response.blob()
    return imageUrlToFile(blob, url)
  } catch {
    return null
  }
}

/** 将 base64 data URI 转为 File 对象 */
function dataUriToFile(dataUri: string): File | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri.trim())
  if (!match) return null
  try {
    const mime = match[1]
    const binary = atob(match[2])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const ext = mime.split('/')[1]?.replace('+xml', '') || 'png'
    return new File([bytes], `base64-image.${ext}`, { type: mime })
  } catch {
    return null
  }
}

/** 加载图片 URL（智能选择直接加载或代理加载），也支持 base64 data URI */
async function loadImageFromUrl(url: string): Promise<File | null> {
  // base64 data URI：直接解码，不走网络
  if (url.startsWith('data:image/')) {
    return dataUriToFile(url)
  }

  // 1. 已知 CORS 受限域名：优先代理
  if (isCorsRestrictedDomain(url)) {
    const proxyResult = await loadViaProxy(url)
    if (proxyResult) return proxyResult
  }

  // 2. 尝试直接加载（带 crossOrigin）
  const directResult = await tryLoadDirect(url)
  if (directResult) return directResult

  // 3. 直接加载失败，尝试代理
  return loadViaProxy(url)
}

function loadSettings(): WatermarkSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS }
}

function App() {
  const [images, setImages] = useState<File[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(loadSettings)
  const [isDragging, setIsDragging] = useState(false)
  const { showToast, showLoading, dismissLoading } = useToast()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watermarkSettings))
    } catch {
      // 水印图片较大时可能超出 localStorage 配额，忽略持久化即可
    }
  }, [watermarkSettings])

  // 全局粘贴：剪贴板有图片就直接添加；如果是图片 URL 则下载后添加
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      let urlText = ''
      const textPromises: Promise<void>[] = []
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile()
          if (blob) imageFiles.push(blob)
        } else if (items[i].type === 'text/plain' || items[i].type === 'text/html') {
          textPromises.push(new Promise((resolve) => {
            items[i].getAsString((s) => {
              if (!urlText) urlText = s
              resolve()
            })
          }))
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault()
        setImages((prev) => {
          const newImages = [...prev, ...imageFiles]
          setSelectedImageIndex(newImages.length - 1)
          return newImages
        })
        showToast('粘贴成功', 'success')
        return
      }

      // 等待异步获取文本完成
      Promise.all(textPromises).then(() => {
        // 处理图片 URL（支持微信图片等无扩展名的 URL）
        if (urlText) {
          const trimmed = urlText.trim()
          // 支持 http/https 图片链接，以及 base64 data URI
          if (/^https?:\/\/.+/i.test(trimmed) || trimmed.startsWith('data:image/')) {
            e.preventDefault()
            const loadingId = showLoading('图片加载中…')
            loadImageFromUrl(trimmed).then((file) => {
              dismissLoading(loadingId)
              if (file) {
                setImages((prev) => {
                  const newImages = [...prev, file]
                  setSelectedImageIndex(newImages.length - 1)
                  return newImages
                })
                showToast('转换成功', 'success')
              } else {
                showToast('图片加载失败，请检查链接', 'error')
              }
            })
          }
        }
      })
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  // 全局拖拽：整个页面支持拖图片
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      // 只有离开整个窗口时才隐藏遮罩
      if (e.relatedTarget === null) {
        setIsDragging(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = e.dataTransfer?.files
      if (!files) return

      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        setImages((prev) => {
          const newImages = [...prev, ...imageFiles]
          setSelectedImageIndex(newImages.length - 1)
          return newImages
        })
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const handleImagesChange = (newImages: File[]) => {
    setImages(newImages)
    if (selectedImageIndex >= newImages.length) {
      setSelectedImageIndex(Math.max(0, newImages.length - 1))
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden relative">
      <Header images={images} watermarkSettings={watermarkSettings} />
      <div className="flex gap-3 p-3 flex-1 min-h-0">
        <div className="w-72 flex-shrink-0 overflow-y-auto">
          <WatermarkConfig settings={watermarkSettings} onChange={setWatermarkSettings} />
        </div>
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <ImageUpload
            images={images}
            onChange={handleImagesChange}
            selectedIndex={selectedImageIndex}
            onSelectIndex={setSelectedImageIndex}
          />
          <Preview
            images={images}
            selectedIndex={selectedImageIndex}
            watermarkSettings={watermarkSettings}
          />
        </div>
      </div>

      {/* 全局拖拽遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-xl font-bold text-gray-800">释放以添加图片</p>
            <p className="text-sm text-gray-500">支持 JPG、PNG、WebP、GIF、BMP、AVIF 等主流格式</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
