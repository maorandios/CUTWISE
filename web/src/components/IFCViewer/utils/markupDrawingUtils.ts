// web/src/components/IFCViewer/utils/markupDrawingUtils.ts
import { MarkupColor } from '../types'
import { getColorHex, getLineWidth } from './colorUtils'

/**
 * Draws a freehand pencil path on the canvas.
 * @param ctx The CanvasRenderingContext2D.
 * @param path Array of {x, y} points representing the path.
 * @param color Optional color override.
 * @param thickness Optional thickness override.
 */
export const drawPencilPath = (
  ctx: CanvasRenderingContext2D,
  path: Array<{ x: number; y: number }>,
  color?: string,
  thickness?: number
) => {
  if (path.length < 2) return

  // Apply settings if provided
  if (color && thickness !== undefined) {
    const colorHex = getColorHex(color as MarkupColor)
    const lineWidth = getLineWidth(thickness)
    ctx.strokeStyle = colorHex
    ctx.fillStyle = colorHex
    ctx.lineWidth = lineWidth
  }

  ctx.beginPath()
  ctx.moveTo(Math.round(path[0].x), Math.round(path[0].y))

  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(Math.round(path[i].x), Math.round(path[i].y))
  }

  ctx.stroke()
}

/**
 * Draws an arrow from start to end point on the canvas.
 * @param ctx The CanvasRenderingContext2D.
 * @param start The starting point {x, y}.
 * @param end The ending point {x, y}.
 * @param color Optional color override.
 * @param thickness Optional thickness override.
 */
export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color?: string,
  thickness?: number
) => {
  // Apply settings if provided
  if (color && thickness !== undefined) {
    const colorHex = getColorHex(color as MarkupColor)
    const lineWidth = getLineWidth(thickness)
    ctx.strokeStyle = colorHex
    ctx.fillStyle = colorHex
    ctx.lineWidth = lineWidth
  }

  // Round coordinates for pixel-perfect rendering
  const startX = Math.round(start.x)
  const startY = Math.round(start.y)
  const endX = Math.round(end.x)
  const endY = Math.round(end.y)

  // Draw main line
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  // Draw arrowhead
  const angle = Math.atan2(endY - startY, endX - startX)
  const arrowLength = 15
  const arrowAngle = Math.PI / 6

  ctx.beginPath()
  ctx.moveTo(endX, endY)
  const arrow1X = Math.round(endX - arrowLength * Math.cos(angle - arrowAngle))
  const arrow1Y = Math.round(endY - arrowLength * Math.sin(angle - arrowAngle))
  const arrow2X = Math.round(endX - arrowLength * Math.cos(angle + arrowAngle))
  const arrow2Y = Math.round(endY - arrowLength * Math.sin(angle + arrowAngle))

  ctx.lineTo(arrow1X, arrow1Y)
  ctx.moveTo(endX, endY)
  ctx.lineTo(arrow2X, arrow2Y)
  ctx.stroke()
}

/**
 * Draws a cloud/revision cloud shape on the canvas.
 * @param ctx The CanvasRenderingContext2D.
 * @param start The starting corner {x, y}.
 * @param end The ending corner {x, y}.
 * @param color Optional color override.
 * @param thickness Optional thickness override.
 */
export const drawCloud = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color?: string,
  thickness?: number
) => {
  // Apply settings if provided
  if (color && thickness !== undefined) {
    const colorHex = getColorHex(color as MarkupColor)
    const lineWidth = getLineWidth(thickness)
    ctx.strokeStyle = colorHex
    ctx.fillStyle = colorHex
    ctx.lineWidth = lineWidth
  }

  // Round coordinates for pixel-perfect rendering
  const minX = Math.round(Math.min(start.x, end.x))
  const maxX = Math.round(Math.max(start.x, end.x))
  const minY = Math.round(Math.min(start.y, end.y))
  const maxY = Math.round(Math.max(start.y, end.y))

  const width = Math.max(maxX - minX, 40) // Minimum width
  const height = Math.max(maxY - minY, 30) // Minimum height

  // Draw revision cloud with scalloped/wavy border (technical drawing style)
  ctx.beginPath()

  const scallopSize = 15 // Size of each scallop (arc radius)

  // Create a rectangle path with scalloped edges
  const top = minY
  const bottom = maxY
  const left = minX
  const right = maxX

  // Calculate number of scallops per side
  const topScallops = Math.max(2, Math.floor(width / (scallopSize * 2)))
  const bottomScallops = Math.max(2, Math.floor(width / (scallopSize * 2)))
  const leftScallops = Math.max(2, Math.floor(height / (scallopSize * 2)))
  const rightScallops = Math.max(2, Math.floor(height / (scallopSize * 2)))

  // Start at top-left corner
  let currentX = left
  let currentY = top

  // Top edge - scallops pointing outward (up)
  ctx.moveTo(Math.round(currentX), Math.round(currentY))
  const topStep = width / topScallops
  for (let i = 0; i < topScallops; i++) {
    const scallopCenterX = Math.round(currentX + topStep / 2)
    const scallopCenterY = Math.round(top - scallopSize)
    ctx.arc(scallopCenterX, scallopCenterY, scallopSize, Math.PI, 0, false) // Arc pointing up
    currentX += topStep
  }
  ctx.lineTo(Math.round(right), Math.round(top))

  // Right edge - scallops pointing outward (right)
  currentY = top
  const rightStep = height / rightScallops
  for (let i = 0; i < rightScallops; i++) {
    const scallopCenterX = Math.round(right + scallopSize)
    const scallopCenterY = Math.round(currentY + rightStep / 2)
    ctx.arc(scallopCenterX, scallopCenterY, scallopSize, -Math.PI / 2, Math.PI / 2, false) // Arc pointing right
    currentY += rightStep
  }
  ctx.lineTo(Math.round(right), Math.round(bottom))

  // Bottom edge - scallops pointing outward (down)
  currentX = right
  const bottomStep = width / bottomScallops
  for (let i = 0; i < bottomScallops; i++) {
    const scallopCenterX = Math.round(currentX - bottomStep / 2)
    const scallopCenterY = Math.round(bottom + scallopSize)
    ctx.arc(scallopCenterX, scallopCenterY, scallopSize, 0, Math.PI, false) // Arc pointing down
    currentX -= bottomStep
  }
  ctx.lineTo(Math.round(left), Math.round(bottom))

  // Left edge - scallops pointing outward (left)
  currentY = bottom
  const leftStep = height / leftScallops
  for (let i = 0; i < leftScallops; i++) {
    const scallopCenterX = Math.round(left - scallopSize)
    const scallopCenterY = Math.round(currentY - leftStep / 2)
    ctx.arc(scallopCenterX, scallopCenterY, scallopSize, Math.PI / 2, -Math.PI / 2, false) // Arc pointing left
    currentY -= leftStep
  }
  ctx.lineTo(Math.round(left), Math.round(top))

  ctx.stroke()
}

/**
 * Redraws all stored markup elements on the canvas.
 * @param ctx The CanvasRenderingContext2D.
 * @param markupElements Array of markup elements to redraw.
 */
export const redrawAllMarkups = (
  ctx: CanvasRenderingContext2D,
  markupElements: Array<{
    type: 'pencil' | 'arrow' | 'cloud' | 'text'
    data: any
    color?: string
    thickness?: number
  }>
) => {
  markupElements.forEach((element) => {
    if (element.type === 'pencil' && element.data.path) {
      drawPencilPath(ctx, element.data.path, element.color, element.thickness)
    } else if (element.type === 'arrow' && element.data.start && element.data.end) {
      drawArrow(ctx, element.data.start, element.data.end, element.color, element.thickness)
    } else if (element.type === 'cloud' && element.data.start && element.data.end) {
      drawCloud(ctx, element.data.start, element.data.end, element.color, element.thickness)
    }
    // Note: text elements are rendered as DOM elements, not canvas drawings
  })
}

