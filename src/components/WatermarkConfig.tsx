import { useState, useRef } from 'react'
import { Upload, RotateCcw } from 'lucide-react'
import { WatermarkSettings } from '../types'
import SliderInput from './SliderInput'

interface WatermarkConfigProps {
  settings: WatermarkSettings
  onChange: (settings: WatermarkSettings) => void
}

const positions = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '上中' },
  { value: 'top-right', label: '右上' },
  { value: 'middle-left', label: '左中' },
  { value: 'middle-center', label: '居中' },
  { value: 'middle-right', label: '右中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '下中' },
  { value: 'bottom-right', label: '右下' },
]

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

export default function WatermarkConfig({ settings, onChange }: WatermarkConfigProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>(settings.type)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (key: keyof WatermarkSettings, value: any) => {
    onChange({ ...settings, [key]: value })
  }

  const handleReset = () => {
    onChange({ ...DEFAULT_SETTINGS })
    setActiveTab('text')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        handleChange('watermarkImage', event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-800">水印设置</h2>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary hover:bg-gray-100 rounded transition-colors"
          title="重置为默认设置"
        >
          <RotateCcw size={12} />
          重置
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1.5 mb-2">
        <button
          onClick={() => {
            setActiveTab('text')
            handleChange('type', 'text')
          }}
          className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === 'text' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          文字水印
        </button>
        <button
          onClick={() => {
            setActiveTab('image')
            handleChange('type', 'image')
          }}
          className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === 'image' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          图片水印
        </button>
      </div>

      {/* 文字水印配置 */}
      {activeTab === 'text' && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">水印文字</label>
            <input
              type="text"
              value={settings.text}
              onChange={(e) => handleChange('text', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="请输入水印文字"
            />
          </div>
          <SliderInput
            label="字体大小"
            value={settings.fontSize}
            min={12}
            max={120}
            unit="px"
            onChange={(val) => handleChange('fontSize', val)}
          />
        </div>
      )}

      {/* 图片水印配置 */}
      {activeTab === 'image' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">水印图片</label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded hover:border-primary transition-colors flex items-center justify-center gap-1.5 text-sm"
          >
            <Upload size={16} />
            <span>{settings.watermarkImage ? '更换图片' : '上传图片'}</span>
          </button>
          {settings.watermarkImage && (
            <img src={settings.watermarkImage} alt="水印" className="mt-1.5 w-full h-16 object-contain border border-gray-200 rounded" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      )}

      {/* 通用配置 */}
      <div className="mt-3 space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">位置</label>
          <div className="grid grid-cols-3 gap-1">
            {positions.map((pos) => (
              <button
                key={pos.value}
                onClick={() => handleChange('position', pos.value)}
                className={`py-1 text-xs rounded transition-colors ${
                  settings.position === pos.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        <SliderInput
          label="透明度"
          value={settings.opacity}
          min={0}
          max={1}
          step={0.1}
          unit=""
          onChange={(val) => handleChange('opacity', val)}
        />

        <SliderInput
          label="旋转角度"
          value={settings.rotation}
          min={-180}
          max={180}
          unit="°"
          onChange={(val) => handleChange('rotation', val)}
        />

        <SliderInput
          label="水平偏移"
          value={settings.offsetX}
          min={-200}
          max={200}
          unit="px"
          onChange={(val) => handleChange('offsetX', val)}
        />

        <SliderInput
          label="垂直偏移"
          value={settings.offsetY}
          min={-200}
          max={200}
          unit="px"
          onChange={(val) => handleChange('offsetY', val)}
        />

        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600">水印颜色</label>
          <input
            type="color"
            value={settings.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-10 h-7 border border-gray-300 rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600">平铺模式</label>
          <button
            onClick={() => handleChange('tile', !settings.tile)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              settings.tile ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                settings.tile ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
