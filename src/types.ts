export type OutputFormat = 'original' | 'png' | 'jpeg' | 'webp'

export interface WatermarkSettings {
  type: 'text' | 'image'
  text: string
  fontSize: number
  color: string
  opacity: number
  rotation: number
  position: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  offsetX: number
  offsetY: number
  tile: boolean
  tileSpacingX: number
  tileSpacingY: number
  watermarkImage: string | null
  /** 导出图片格式：保持原格式 / 强制转换为 png·jpeg·webp */
  outputFormat: OutputFormat
  /** 导出时是否带水印 */
  outputWithWatermark: boolean
}
