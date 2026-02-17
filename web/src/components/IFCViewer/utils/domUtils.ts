/**
 * Create a text input element for markup
 */
export function createTextInput(
  x: number,
  y: number,
  onComplete: (text: string) => void,
  onCancel: () => void
): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'text'
  input.style.position = 'absolute'
  input.style.left = `${x}px`
  input.style.top = `${y}px`
  input.style.zIndex = '1000'
  input.style.padding = '4px 8px'
  input.style.border = '2px solid #3b82f6'
  input.style.borderRadius = '4px'
  input.style.fontSize = '14px'
  input.style.fontFamily = 'Arial, sans-serif'
  input.style.outline = 'none'
  input.style.backgroundColor = 'white'
  input.style.minWidth = '150px'
  
  // Handle completion
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const text = input.value.trim()
      if (text) {
        onComplete(text)
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  })
  
  // Handle blur (clicking outside)
  input.addEventListener('blur', () => {
    const text = input.value.trim()
    if (text) {
      onComplete(text)
    } else {
      onCancel()
    }
  })
  
  return input
}

/**
 * Create a text display element for markup
 */
export function createTextDisplay(
  x: number,
  y: number,
  text: string,
  color: string = '#000000',
  fontSize: number = 14
): HTMLDivElement {
  const div = document.createElement('div')
  div.textContent = text
  div.style.position = 'absolute'
  div.style.left = `${x}px`
  div.style.top = `${y}px`
  div.style.color = color
  div.style.fontSize = `${fontSize}px`
  div.style.fontFamily = 'Arial, sans-serif'
  div.style.fontWeight = 'bold'
  div.style.padding = '2px 6px'
  div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
  div.style.border = `1px solid ${color}`
  div.style.borderRadius = '3px'
  div.style.pointerEvents = 'none'
  div.style.userSelect = 'none'
  div.style.whiteSpace = 'nowrap'
  div.style.zIndex = '100'
  
  return div
}

/**
 * Remove element from DOM safely
 */
export function removeElement(element: HTMLElement | null): void {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element)
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Download a file with given content
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}

/**
 * Copy image to clipboard
 */
export async function copyImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    
    if (!blob) return false
    
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    
    return true
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err)
    return false
  }
}

