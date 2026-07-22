import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'

interface ImageUploadProps {
  images: File[]
  onChange: (images: File[]) => void
  selectedIndex: number
  onSelectIndex: (index: number) => void
}

export default function ImageUpload({ images, onChange, selectedIndex, onSelectIndex }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    onChange([...images, ...imageFiles])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 flex-shrink-0">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg py-3 px-4 text-center cursor-pointer transition-colors flex items-center justify-center gap-3 ${
          isDragging ? 'border-primary bg-orange-50' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <Upload className="text-gray-400" size={24} />
        <div className="text-left">
          <p className="text-sm text-gray-600">拖拽、点击或粘贴上传图片</p>
          <p className="text-xs text-gray-400">支持 JPG、PNG、WebP</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1.5">
            已上传 {images.length} 张
            <span className="text-gray-400 ml-1">（点击切换预览）</span>
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <div
                key={index}
                onClick={() => onSelectIndex(index)}
                className={`relative group flex-shrink-0 w-14 h-14 cursor-pointer rounded overflow-hidden transition-all ${
                  selectedIndex === index
                    ? 'ring-2 ring-primary ring-offset-1'
                    : 'border border-gray-200 hover:border-primary'
                }`}
              >
                <img
                  src={URL.createObjectURL(image)}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                {selectedIndex === index && (
                  <div className="absolute inset-0 bg-primary/10" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage(index)
                  }}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
