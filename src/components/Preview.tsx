import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { WatermarkSettings } from '../types'
import { renderWatermark, extensionFromMime, resolveOutputMimeForSource } from '../utils/watermark'
import { useToast } from './Toast'

interface PreviewProps {
  images: File[]
  selectedIndex: number
  watermarkSettings: WatermarkSettings
}

export default function Preview({ images, selectedIndex, watermarkSettings }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

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
      liveCtx.drawImage(img, 0, 0)
      await renderWatermark(liveCtx, liveCanvas.width, liveCanvas.height, watermarkSettings)
    }
    img.src = URL.createObjectURL(images[selectedIndex])
  }, [images, selectedIndex, watermarkSettings])

  const handleCopy = async () => {
    if (!canvasRef.current) return
    const selectedImage = images[selectedIndex]
    // 按原图格式导出（保留 png/jpeg/webp，其余回退 png）
    const outputMime = resolveOutputMimeForSource(selectedImage.type)
    // 剪贴板仅支持 png / webp，复制时优先用 webp 以减小体积
    const clipboardMime = outputMime === 'image/jpeg' ? 'image/png' : outputMime
    const downloadExt = extensionFromMime(outputMime)
    const downloadName = (selectedImage.name.replace(/\.[^./\\]+$/, '') || 'watermarked') + '.' + downloadExt

    try {
      // 尝试从画布导出 blob
      let blob: Blob | null = null
      try {
        blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, outputMime)
        )
      } catch (canvasError) {
        // 画布被跨域图片污染，无法导出
        console.warn('画布被污染，尝试直接下载原图')
      }
      
      if (!blob) {
        // 如果画布导出失败，尝试直接下载外部图片
        const imageUrl = (selectedImage as any).imageUrl
        if (imageUrl) {
          const a = document.createElement('a')
          a.href = imageUrl
          a.download = downloadName
          a.target = '_blank'
          a.click()
          showToast('由于浏览器安全限制，已下载原图，可手动添加水印', 'error')
          return
        }
        return
      }

      // 尝试 Clipboard API（png / webp）
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ [clipboardMime]: blob })])
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
          showToast('复制成功', 'success')
          return
        } catch {
          // Clipboard API 失败，尝试降级方案
        }
      }

      // 降级方案：创建临时 img 元素，选中后复制
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)

        try {
          canvas.toBlob(async (b) => {
            if (!b) return
            try {
              await navigator.clipboard.write([new ClipboardItem({ [clipboardMime]: b })])
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
              showToast('复制成功', 'success')
            } catch {
              // 最终降级：直接下载图片
              const a = document.createElement('a')
              a.href = url
              a.download = downloadName
              a.click()
              showToast('浏览器不支持复制图片，已为您下载图片', 'error')
            }
            URL.revokeObjectURL(url)
          }, outputMime)
        } catch {
          // 降级画布也被污染，直接下载
          const a = document.createElement('a')
          a.href = url
          a.download = downloadName
          a.click()
          URL.revokeObjectURL(url)
          showToast('由于浏览器安全限制，已为您下载图片', 'error')
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        showToast('图片加载失败', 'error')
      }
      img.src = url
    } catch (err) {
      console.error('复制失败:', err)
      showToast('复制失败，请检查浏览器权限', 'error')
    }
  }

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
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex-1 min-h-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  )
}
