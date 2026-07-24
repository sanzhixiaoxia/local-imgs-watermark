import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
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
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const { showToast } = useToast()

  const selectedImage = images[selectedIndex]
  const outputMime = resolveOutputMime(watermarkSettings, selectedImage?.type || '')
  const formatLabel: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
    'image/png': 'PNG',
  }
  const currentFormat = formatLabel[outputMime] ?? 'PNG'

  const handleContextMenu = (e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const closeMenu = () => setMenuPos(null)

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas || !selectedImage) return
    const downloadExt = extensionFromMime(outputMime)
    const downloadName = (selectedImage.name.replace(/\.[^./\\]+$/, '') || 'watermarked') + '.' + downloadExt
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showToast('下载失败', 'error')
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = downloadName
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        showToast('已开始下载', 'success')
      },
      outputMime,
    )
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
      const outputMime = resolveOutputMime(watermarkSettings, selected?.type || '')
      // JPEG 不支持透明，预览时也铺白底，所见即所得
      if (outputMime === 'image/jpeg') {
        liveCtx.fillStyle = '#ffffff'
        liveCtx.fillRect(0, 0, liveCanvas.width, liveCanvas.height)
      }

      liveCtx.drawImage(img, 0, 0)
      // 勾选了“带水印”才叠加水印
      if (watermarkSettings.outputWithWatermark) {
        await renderWatermark(liveCtx, liveCanvas.width, liveCanvas.height, watermarkSettings)
      }
    }
    img.src = URL.createObjectURL(images[selectedIndex])
  }, [images, selectedIndex, watermarkSettings])

  const handleCopy = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const selectedImage = images[selectedIndex]
    // 按设置决定导出格式（保持原格式 / 强制 png·jpeg·webp）
    const outputMime = resolveOutputMime(watermarkSettings, selectedImage.type)
    // 剪贴板仅支持 png / webp，jpeg 复制时降级为 png 位图
    const clipboardMime = outputMime === 'image/jpeg' ? 'image/png' : outputMime
    const downloadExt = extensionFromMime(outputMime)
    const downloadName =
      (selectedImage.name.replace(/\.[^./\\]+$/, '') || 'watermarked') + '.' + downloadExt

    // 复制时统一用 clipboardMime 导出，保证 blob 类型与 ClipboardItem 的 key 一致
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, clipboardMime)
    )
    if (!blob) {
      showToast('复制失败，画布无法导出', 'error')
      return
    }

    // 优先尝试写入剪贴板
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ [clipboardMime]: blob })])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        showToast('复制成功', 'success')
        return
      } catch {
        // 剪贴板不可用（无权限/非安全上下文等），降级为下载
      }
    }

    // 降级：直接下载图片（按所选输出格式）
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('浏览器不支持复制图片，已为您下载图片', 'error')
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
          onContextMenu={handleContextMenu}
        />
      </div>

      {menuPos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
            onContextMenu={(e) => {
              e.preventDefault()
              closeMenu()
            }}
          />
          <div
            className="fixed z-50 min-w-[168px] bg-white rounded-lg shadow-xl border border-gray-100 py-1 text-sm overflow-hidden"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              onClick={() => {
                handleCopy()
                closeMenu()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Copy size={14} />
              复制图片
            </button>
            <button
              onClick={() => {
                handleDownload()
                closeMenu()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Download size={14} />
              下载图片（{currentFormat}）
            </button>
          </div>
        </>
      )}
    </div>
  )
}
