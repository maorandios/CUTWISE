// web/src/components/IFCViewer/utils/screenshotUtils.ts
import * as THREE from 'three'
import { MarkupElement } from '../types'
import { drawArrow, drawCloud } from './markupDrawingUtils'

/**
 * Captures a screenshot by combining the 3D renderer canvas with markup overlays.
 * @param renderer The THREE.WebGLRenderer.
 * @param scene The THREE.Scene.
 * @param camera The THREE.PerspectiveCamera.
 * @param container The HTML container element.
 * @param markupCanvas The markup canvas element (optional).
 * @param markupMode Whether markup mode is active.
 * @param markupElements Array of markup elements to include.
 * @returns A data URL string of the captured image, or null if capture fails.
 */
export const captureScreenshot = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  container: HTMLDivElement,
  markupCanvas: HTMLCanvasElement | null,
  markupMode: boolean,
  markupElements: MarkupElement[]
): string | null => {
  if (!renderer || !scene || !camera || !container) {
    console.error('[SCREENSHOT] Missing required elements for capture')
    return null
  }

  try {
    // Force a render to ensure the scene is up to date
    renderer.render(scene, camera)

    // Get container dimensions
    const rect = container.getBoundingClientRect()

    // Create a temporary canvas to combine all layers
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = rect.width
    tempCanvas.height = rect.height
    const tempCtx = tempCanvas.getContext('2d')

    if (!tempCtx) {
      console.error('[SCREENSHOT] Failed to get 2D context for temp canvas')
      return null
    }

    // Draw the 3D renderer canvas first (background)
    tempCtx.drawImage(renderer.domElement, 0, 0, rect.width, rect.height)

    // If markup mode is active, include markup elements
    if (markupMode && markupCanvas) {
      // Draw existing canvas content
      if (markupCanvas.width > 0 && markupCanvas.height > 0) {
        tempCtx.drawImage(markupCanvas, 0, 0, rect.width, rect.height)
      }

      // Redraw all stored markup elements to ensure they're all captured
      tempCtx.lineCap = 'round'
      tempCtx.lineJoin = 'round'

      markupElements.forEach((element) => {
        if (element.type === 'arrow' && element.data.start && element.data.end) {
          drawArrow(tempCtx, element.data.start, element.data.end, element.color, element.thickness)
        } else if (element.type === 'cloud' && element.data.start && element.data.end) {
          drawCloud(tempCtx, element.data.start, element.data.end, element.color, element.thickness)
        }
        // Note: pencil paths are already drawn on the markup canvas
        // Note: text elements are DOM elements and need special handling
      })

      // Capture text elements as overlays
      const textElements = container.querySelectorAll('[data-markup-text]')
      textElements.forEach((textEl) => {
        const htmlEl = textEl as HTMLElement
        const rect = htmlEl.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        // Calculate position relative to container
        const x = rect.left - containerRect.left
        const y = rect.top - containerRect.top

        // Draw text element background
        tempCtx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        tempCtx.strokeStyle = '#ff0000'
        tempCtx.lineWidth = 2
        tempCtx.fillRect(x, y, rect.width, rect.height)
        tempCtx.strokeRect(x, y, rect.width, rect.height)

        // Draw text content
        const textarea = htmlEl.querySelector('textarea')
        if (textarea && textarea.value) {
          tempCtx.fillStyle = '#000000'
          tempCtx.font = '20px Arial'
          const lines = textarea.value.split('\n')
          lines.forEach((line, index) => {
            tempCtx.fillText(line, x + 8, y + 28 + index * 28)
          })
        }
      })
    }

    // Convert to data URL
    const dataURL = tempCanvas.toDataURL('image/png')
    console.log('[SCREENSHOT] Screenshot captured successfully')
    return dataURL
  } catch (error) {
    console.error('[SCREENSHOT] Error capturing screenshot:', error)
    return null
  }
}

/**
 * Saves a screenshot as a downloadable PNG file.
 * @param dataURL The data URL of the screenshot.
 * @param filename Optional custom filename (without extension).
 * @returns True if successful, false otherwise.
 */
export const saveScreenshotToFile = (dataURL: string, filename?: string): boolean => {
  try {
    const link = document.createElement('a')
    const defaultFilename = `model-screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
    link.download = filename ? `${filename}.png` : defaultFilename
    link.href = dataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    console.log('[SCREENSHOT] Screenshot saved to file')
    return true
  } catch (error) {
    console.error('[SCREENSHOT] Error saving screenshot to file:', error)
    return false
  }
}

/**
 * Copies a screenshot to the system clipboard.
 * @param dataURL The data URL of the screenshot.
 * @returns A Promise that resolves to true if successful, false otherwise.
 */
export const copyScreenshotToClipboard = async (dataURL: string): Promise<boolean> => {
  try {
    // Convert data URL to blob
    const response = await fetch(dataURL)
    const blob = await response.blob()

    // Copy to clipboard using Clipboard API
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      console.log('[SCREENSHOT] Screenshot copied to clipboard')
      return true
    } else {
      console.warn('[SCREENSHOT] Clipboard API not supported in this browser')
      return false
    }
  } catch (error) {
    console.error('[SCREENSHOT] Error copying screenshot to clipboard:', error)
    return false
  }
}

