/**
 * Get canvas 2D context
 */
export function getCanvasContext(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!canvas) return null
  return canvas.getContext('2d')
}

/**
 * Setup canvas with proper dimensions and device pixel ratio
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  applySettings?: (ctx: CanvasRenderingContext2D) => void
): void {
  // Get device pixel ratio for crisp rendering on high-DPI displays
  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()
  
  // Set display size (CSS pixels)
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  
  // Set actual size in memory (scaled for device pixel ratio)
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  
  const ctx = getCanvasContext(canvas)
  if (ctx) {
    // Scale the context to match device pixel ratio
    ctx.scale(dpr, dpr)
    
    // Enable better rendering quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    // Apply custom settings if provided
    if (applySettings) {
      applySettings(ctx)
    }
  }
}

/**
 * Clear canvas
 */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = getCanvasContext(canvas)
  if (!ctx) return
  
  const dpr = window.devicePixelRatio || 1
  const displayWidth = canvas.width / dpr
  const displayHeight = canvas.height / dpr
  
  ctx.clearRect(0, 0, displayWidth, displayHeight)
}

/**
 * Get canvas coordinates from client coordinates
 */
export function getCanvasCoordinates(
  container: HTMLElement,
  clientX: number,
  clientY: number,
  round: boolean = true
): { x: number; y: number } | null {
  const rect = container.getBoundingClientRect()
  
  // Calculate position relative to container
  const x = clientX - rect.left
  const y = clientY - rect.top
  
  // Round to nearest pixel for crisp rendering if requested
  return {
    x: round ? Math.round(x) : x,
    y: round ? Math.round(y) : y
  }
}

