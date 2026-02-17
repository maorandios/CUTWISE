import { MarkupColor } from '../types'

/**
 * Convert color name to hex string
 */
export function getColorHex(colorName: MarkupColor): string {
  const colorMap: Record<MarkupColor, string> = {
    red: '#ff0000',
    black: '#000000',
    yellow: '#ffff00',
    green: '#00ff00',
    blue: '#0000ff'
  }
  return colorMap[colorName]
}

/**
 * Map thickness level (1-5) to line width in pixels
 */
export function getLineWidth(thickness: number): number {
  const widthMap: { [key: number]: number } = {
    1: 1,
    2: 2,
    3: 3,
    4: 5,
    5: 8
  }
  return widthMap[thickness] || 3
}

/**
 * Apply markup settings to canvas context
 */
export function applyMarkupSettings(
  ctx: CanvasRenderingContext2D,
  color: MarkupColor,
  thickness: number
): void {
  const colorHex = getColorHex(color)
  const lineWidth = getLineWidth(thickness)
  
  ctx.strokeStyle = colorHex
  ctx.fillStyle = colorHex
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 10
  
  // Enable smooth rendering for pencil strokes
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

