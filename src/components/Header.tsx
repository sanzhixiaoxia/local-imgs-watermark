import { useState } from 'react'
import { Download, Loader2, CheckCircle2 } from 'lucide-react'
import { WatermarkSettings } from '../types'
import { exportImages } from '../utils/watermark'

interface HeaderProps {
  images: File[]
  watermarkSettings: WatermarkSettings
}

type ExportState = 'idle' | 'exporting' | 'done'

export default function Header({ images, watermarkSettings }: HeaderProps) {
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const handleExport = async () => {
    if (images.length === 0) {
      alert('请先上传图片')
      return
    }
    setExportState('exporting')
    setProgress({ done: 0, total: images.length })
    try {
      await exportImages(images, watermarkSettings, (done, total) => {
        setProgress({ done, total })
      })
      setExportState('done')
      setTimeout(() => setExportState('idle'), 2000)
    } catch (e) {
      console.error(e)
      setExportState('idle')
    }
  }

  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <h1 className="text-base font-bold text-gray-800">本地加水印</h1>
        </div>

        <div className="flex items-center gap-3">
          {exportState !== 'idle' && (
            <div className="w-44">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">
                  {exportState === 'done' ? '处理完成' : '处理中'}
                </span>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {exportState === 'done' ? '100%' : `${percent}%`}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                {exportState === 'done' ? (
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500" style={{ width: '100%' }} />
                ) : (
                  <div
                    className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all duration-300 ease-out relative"
                    style={{ width: `${percent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="text-[10px] text-gray-400 text-right mt-0.5 tabular-nums">
                {exportState === 'done' ? `${progress.total}/${progress.total} 张` : `${progress.done}/${progress.total} 张`}
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exportState === 'exporting'}
            className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg font-medium transition-colors text-sm ${
              exportState === 'exporting'
                ? 'bg-primary/60 cursor-not-allowed'
                : exportState === 'done'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {exportState === 'exporting' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : exportState === 'done' ? (
              <CheckCircle2 size={16} />
            ) : (
              <Download size={16} />
            )}
            {exportState === 'exporting' ? '处理中…' : exportState === 'done' ? '已完成' : '批量下载'}
          </button>
        </div>
      </div>
    </header>
  )
}
