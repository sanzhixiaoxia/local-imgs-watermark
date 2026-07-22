import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { WatermarkSettings } from '../types'
import { renderWatermark } from '../utils/watermark'

interface PreviewProps {
  images: File[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  watermarkSettings: WatermarkSettings
}

export default function Preview({ images, selectedIndex, onSelectIndex, watermarkSettings }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (images.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      renderWatermark(ctx, canvas.width, canvas.height, watermarkSettings)
    }
    img.src = URL.createObjectURL(images[selectedIndex])
  }, [images, selectedIndex, watermarkSettings])

  const handleCopy = async () => {
    if (!canvasRef.current) return
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, 'image/png')
      )
      if (!blob) return

      // 尝试 Clipboard API
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
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
        ctx!.drawImage(img, 0, 0)

        canvas.toBlob(async (b) => {
          if (!b) return
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } catch {
            // 最终降级：直接下载图片
            const a = document.createElement('a')
            a.href = url
            a.download = 'watermarked.png'
            a.click()
            alert('浏览器不支持复制图片，已为您下载图片，可手动复制')
          }
          URL.revokeObjectURL(url)
        }, 'image/png')
      }
      img.src = url
    } catch (err) {
      console.error('复制失败:', err)
      alert('复制失败，请检查浏览器权限')
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
