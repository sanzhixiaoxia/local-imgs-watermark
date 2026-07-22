import { Download } from 'lucide-react'
import { WatermarkSettings } from '../types'
import { exportImages } from '../utils/watermark'

interface HeaderProps {
  images: File[]
  watermarkSettings: WatermarkSettings
}

export default function Header({ images, watermarkSettings }: HeaderProps) {
  const handleExport = async () => {
    if (images.length === 0) {
      alert('请先上传图片')
      return
    }
    await exportImages(images, watermarkSettings)
  }

  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <h1 className="text-base font-bold text-gray-800">本地加水印</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Download size={16} />
          批量下载
        </button>
      </div>
    </header>
  )
}
