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
}
