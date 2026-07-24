import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { WatermarkSettings } from '../types'

export async function renderWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: WatermarkSettings
) {
  ctx.save()
  ctx.globalAlpha = settings.opacity

  if (settings.type === 'text') {
    renderTextWatermark(ctx, width, height, settings)
  } else if (settings.type === 'image' && settings.watermarkImage) {
    await renderImageWatermark(ctx, width, height, settings)
  }

  ctx.restore()
}

function renderTextWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: WatermarkSettings
) {
  ctx.font = `${settings.fontSize}px "Noto Sans SC", sans-serif`
  ctx.fillStyle = settings.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const { x, y } = calculatePosition(width, height, settings)

  if (settings.tile) {
    const stepX = settings.fontSize * settings.text.length * settings.tileSpacingX
    const stepY = settings.fontSize * settings.tileSpacingY
    for (let i = 0; i < width + stepX; i += stepX) {
      for (let j = 0; j < height + stepY; j += stepY) {
        drawText(ctx, settings.text, i, j, settings.rotation)
      }
    }
  } else {
    drawText(ctx, settings.text, x, y, settings.rotation)
  }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, rotation: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

async function renderImageWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: WatermarkSettings
) {
  if (!settings.watermarkImage) return

  const img = new Image()
  img.src = settings.watermarkImage
  await img.decode()

  const watermarkWidth = width * 0.2
  const watermarkHeight = (img.height / img.width) * watermarkWidth

  const { x, y } = calculatePosition(width, height, settings)

  if (settings.tile) {
    const stepX = watermarkWidth * settings.tileSpacingX
    const stepY = watermarkHeight * settings.tileSpacingY
    for (let i = 0; i < width + stepX; i += stepX) {
      for (let j = 0; j < height + stepY; j += stepY) {
        drawImage(ctx, img, i - watermarkWidth / 2, j - watermarkHeight / 2, watermarkWidth, watermarkHeight, settings.rotation)
      }
    }
  } else {
    drawImage(ctx, img, x - watermarkWidth / 2, y - watermarkHeight / 2, watermarkWidth, watermarkHeight, settings.rotation)
  }
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
) {
  ctx.save()
  ctx.translate(x + width / 2, y + height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(img, -width / 2, -height / 2, width, height)
  ctx.restore()
}

function calculatePosition(width: number, height: number, settings: WatermarkSettings) {
  const padding = 50
  let x = width / 2
  let y = height / 2

  switch (settings.position) {
    case 'top-left':
      x = padding
      y = padding
      break
    case 'top-center':
      x = width / 2
      y = padding
      break
    case 'top-right':
      x = width - padding
      y = padding
      break
    case 'middle-left':
      x = padding
      y = height / 2
      break
    case 'middle-center':
      x = width / 2
      y = height / 2
      break
    case 'middle-right':
      x = width - padding
      y = height / 2
      break
    case 'bottom-left':
      x = padding
      y = height - padding
      break
    case 'bottom-center':
      x = width / 2
      y = height - padding
      break
    case 'bottom-right':
      x = width - padding
      y = height - padding
      break
  }

  x += settings.offsetX
  y += settings.offsetY

  return { x, y }
}

export async function exportImages(images: File[], settings: WatermarkSettings) {
  const zip = new JSZip()

  for (const image of images) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    const img = new Image()
    img.src = URL.createObjectURL(image)
    await img.decode()

    canvas.width = img.width
    canvas.height = img.height

    ctx.drawImage(img, 0, 0)
    await renderWatermark(ctx, canvas.width, canvas.height, settings)

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png')
    })

    zip.file(image.name, blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'watermarked-images.zip')
}
