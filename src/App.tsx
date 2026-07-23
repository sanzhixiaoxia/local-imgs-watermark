import { useState, useEffect } from 'react'
import Header from './components/Header'
import ImageUpload from './components/ImageUpload'
import WatermarkConfig from './components/WatermarkConfig'
import Preview from './components/Preview'
import { WatermarkSettings } from './types'

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
  watermarkImage: null,
}

const STORAGE_KEY = 'watermark-settings'

function loadSettings(): WatermarkSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_SETTINGS, ...parsed, watermarkImage: null }
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

  useEffect(() => {
    const { watermarkImage: _, ...rest } = watermarkSettings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
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
        return
      }

      // 等待异步获取文本完成
      Promise.all(textPromises).then(() => {
        // 处理图片 URL（支持微信图片等无扩展名的 URL）
        if (urlText) {
          const trimmed = urlText.trim()
          // 放宽匹配：只要是以 http/https 开头的 URL 都尝试加载
          if (/^https?:\/\/.+/i.test(trimmed)) {
            e.preventDefault()
            // 使用 img 标签加载，设置 crossOrigin 以支持 canvas 导出
            // referrerPolicy='no-referrer' 阻止发送 Referer，绕过微信防盗链
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.referrerPolicy = 'no-referrer'
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width = img.naturalWidth
              canvas.height = img.naturalHeight
              const ctx = canvas.getContext('2d')
              if (!ctx) return
              ctx.drawImage(img, 0, 0)
              canvas.toBlob((blob) => {
                if (!blob) return
                const fileName = trimmed.split('/').pop()?.split('?')[0] || 'pasted-image.png'
                const file = new File([blob], fileName, { type: blob.type })
                setImages((prev) => {
                  const newImages = [...prev, file]
                  setSelectedImageIndex(newImages.length - 1)
                  return newImages
                })
              }, 'image/png')
            }
            img.onerror = () => {
              // 静默失败
            }
            img.src = trimmed
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
            <p className="text-sm text-gray-500">支持 JPG、PNG、WebP 格式</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
