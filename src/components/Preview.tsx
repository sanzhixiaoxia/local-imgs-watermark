import { useEffect, useRef, useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { WatermarkSettings } from '../types'
import { renderWatermark, extensionFromMime, resolveOutputMime } from '../utils/watermark'
import { useToast } from './Toast'

interface PreviewProps {
  images: File[]
  selectedIndex: number
  watermarkSettings: WatermarkSettings
}

export default function Preview({ images, selectedIndex, watermarkSettings }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const { showToast } = useToast()

  const selectedImage = images[selectedIndex]
  const outputMime = resolveOutputMime(selectedImage?.type || '')

  const exportBlob = (mime: string): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) return resolve(null)
      canvas.toBlob(resolve, mime)
    })

  const handleCopy = async () => {
    const blob = await exportBlob('image/png')
    if (!blob) {
      showToast('复制失败，画布无法导出', 'error')
      return
    }
    try {
      // 直接写入剪贴板（需安全上下文：https 或 localhost）。dev 已启用 HTTPS，IP 访问同样可用。
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showToast('复制成功', 'success')
    } catch {
      showToast('复制失败，请右键点击图片选择“复制图片”', 'error')
    }
  }

  const handleDownload = async () => {
    const blob = await exportBlob(outputMime)
    if (!blob) {
      showToast('下载失败', 'error')
      return
    }
    const downloadName =
      (selectedImage.name.replace(/\.[^./\\]+$/, '') || 'watermarked') +
      '.' +
      extensionFromMime(outputMime)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
    showToast('已开始下载', 'success')
  }

  useEffect(() => {
    if (images.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = async () => {
      // 重新获取最新的 canvas / ctx，避免 React 重渲染后上下文失效
      const liveCanvas = canvasRef.current
      if (!liveCanvas) return
      const liveCtx = liveCanvas.getContext('2d')
      if (!liveCtx) return
      liveCanvas.width = img.width
      liveCanvas.height = img.height
      liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height)

      const selected = images[selectedIndex]
      const outputMime = resolveOutputMime(selected?.type || '')
      // JPEG 不支持透明，预览时也铺白底，所见即所得
      if (outputMime === 'image/jpeg') {
        liveCtx.fillStyle = '#ffffff'
        liveCtx.fillRect(0, 0, liveCanvas.width, liveCanvas.height)
      }

      liveCtx.drawImage(img, 0, 0)
      // 始终叠加水印
      await renderWatermark(liveCtx, liveCanvas.width, liveCanvas.height, watermarkSettings)

      // 生成预览图（用于展示与原生右键“复制图片”，不依赖安全上下文）
      liveCanvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      }, 'image/png')
    }
    img.src = URL.createObjectURL(images[selectedIndex])
  }, [images, selectedIndex, watermarkSettings])

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm flex-1 flex items-center justify-center text-gray-400 text-sm">
        请先上传图片或粘贴图片（Ctrl+V）以预览效果
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">预览</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
              downloaded
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-primary hover:text-white'
            }`}
          >
            {downloaded ? <Check size={14} /> : <Download size={14} />}
            {downloaded ? '已下载' : '下载图片'}
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-primary hover:text-white'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制图片'}
          </button>
        </div>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex-1 min-h-0 flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="加好水印的预览"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <span className="text-gray-400 text-sm">加载预览中…</span>
        )}
      </div>

      {/* 离屏画布，仅用于导出 / 复制，不直接展示 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
