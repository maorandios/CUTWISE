// web/src/components/IFCViewer/utils/measurementUtils.ts
import * as THREE from 'three'
import { calculateDotSize, createMeasurementDot as createMeasurementDotUtil } from './geometryUtils'

export interface MeasurementData {
  arrow: THREE.ArrowHelper | null
  label: HTMLDivElement | null
  dots: THREE.Mesh[]
  start: THREE.Vector3
  end: THREE.Vector3
}

/**
 * Create a red dot at a measurement point.
 */
export const createMeasurementDotWithScene = (
  point: THREE.Vector3,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  containerHeight: number,
  measurementDotsArray: THREE.Mesh[]
): THREE.Mesh | null => {
  const dotSize = calculateDotSize(point, camera, containerHeight, 8)
  const dot = createMeasurementDotUtil(point, dotSize, 0xff0000)
  
  scene.add(dot)
  measurementDotsArray.push(dot)
  
  return dot
}

/**
 * Create a preview arrow from start point to current cursor position.
 */
export const createPreviewArrow = (
  startPoint: THREE.Vector3,
  currentPoint: THREE.Vector3,
  scene: THREE.Scene,
  previewArrowRef: React.MutableRefObject<THREE.ArrowHelper | null>
): void => {
  // Remove existing preview arrow
  if (previewArrowRef.current) {
    scene.remove(previewArrowRef.current)
    previewArrowRef.current.traverse((child: THREE.Object3D) => {
      const obj = child as any
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
    previewArrowRef.current = null
  }
  
  // Create new preview arrow
  const direction = new THREE.Vector3().subVectors(currentPoint, startPoint)
  const length = direction.length()
  
  if (length > 0.001) {
    const arrowDirection = direction.clone().normalize()
    
    const arrowHelper = new THREE.ArrowHelper(
      arrowDirection,
      startPoint,
      length,
      0xff0000, // Red color
      length * 0.1, // Head length
      length * 0.05 // Head width
    )
    
    arrowHelper.name = 'measurement-preview-arrow'
    scene.add(arrowHelper)
    previewArrowRef.current = arrowHelper
  }
}

/**
 * Create a measurement label HTML element.
 */
export const createMeasurementLabel = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  distance: number,
  camera: THREE.PerspectiveCamera,
  container: HTMLElement,
  measurementLabelDivRef: React.MutableRefObject<HTMLDivElement | null>
): HTMLDivElement | null => {
  // Calculate midpoint
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  
  // Format distance - show in mm, or m if > 1000mm
  const distanceInMm = distance
  let displayText: string
  if (distanceInMm >= 1000) {
    displayText = `${(distanceInMm / 1000).toFixed(2)} m`
  } else {
    displayText = `${distanceInMm.toFixed(0)} mm`
  }
  
  // Remove existing label if any
  if (measurementLabelDivRef.current) {
    measurementLabelDivRef.current.remove()
    measurementLabelDivRef.current = null
  }
  
  // Create HTML div for label
  const labelDiv = document.createElement('div')
  labelDiv.textContent = displayText
  labelDiv.style.position = 'absolute'
  labelDiv.style.pointerEvents = 'none'
  labelDiv.style.userSelect = 'none'
  labelDiv.style.color = '#ffffff'
  labelDiv.style.fontSize = '16px'
  labelDiv.style.fontWeight = 'bold'
  labelDiv.style.fontFamily = 'Arial, sans-serif'
  labelDiv.style.background = 'rgba(0, 0, 0, 0.85)'
  labelDiv.style.border = '2px solid #ff0000'
  labelDiv.style.borderRadius = '8px'
  labelDiv.style.padding = '6px 12px'
  labelDiv.style.whiteSpace = 'nowrap'
  labelDiv.style.zIndex = '1000'
  labelDiv.style.transform = 'translate(-50%, -50%)' // Center on point
  labelDiv.style.textAlign = 'center'
  
  container.appendChild(labelDiv)
  measurementLabelDivRef.current = labelDiv
  
  // Store midpoint on the label div so update function can access it
  const storedMidpoint = midpoint.clone()
  ;(labelDiv as any).midpoint = storedMidpoint
  
  // Update position function
  const updateLabelPosition = () => {
    if (!labelDiv || !camera || !container) return
    
    // Get stored midpoint
    const storedMidpoint = (labelDiv as any).midpoint as THREE.Vector3
    if (!storedMidpoint) return
    
    // Project 3D point to screen coordinates
    const vector = storedMidpoint.clone()
    vector.project(camera)
    
    const x = (vector.x * 0.5 + 0.5) * container.clientWidth
    const y = (-vector.y * 0.5 + 0.5) * container.clientHeight
    
    // Only show if point is in front of camera
    if (vector.z < 1) {
      labelDiv.style.left = `${x}px`
      labelDiv.style.top = `${y}px`
      labelDiv.style.display = 'block'
    } else {
      labelDiv.style.display = 'none'
    }
  }
  
  // Update position immediately
  updateLabelPosition()
  
  // Store update function for animate loop
  ;(labelDiv as any).updatePosition = updateLabelPosition
  
  console.log('[MEASUREMENT] HTML Label created:', displayText, 'at midpoint:', midpoint)
  
  return labelDiv
}

/**
 * Create final measurement arrow between two points.
 */
export const createMeasurementArrow = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  container: HTMLElement,
  measurementLineRef: React.MutableRefObject<THREE.Line | null>,
  measurementLabelRef: React.MutableRefObject<THREE.Group | null>,
  measurementLabelDivRef: React.MutableRefObject<HTMLDivElement | null>,
  measurementDotsRef: React.MutableRefObject<THREE.Mesh[]>,
  measurementPointsRef: React.MutableRefObject<THREE.Vector3[]>,
  previewArrowRef: React.MutableRefObject<THREE.ArrowHelper | null>,
  allMeasurementsRef: React.MutableRefObject<MeasurementData[]>
): void => {
  console.log('[MEASUREMENT] createMeasurementArrow called with:', start, end)
  
  // Remove preview arrow
  if (previewArrowRef.current) {
    scene.remove(previewArrowRef.current)
    previewArrowRef.current.traverse((child: THREE.Object3D) => {
      const obj = child as any
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
    previewArrowRef.current = null
  }
  
  // Clear existing measurement arrow
  if (measurementLineRef.current) {
    scene.remove(measurementLineRef.current)
    measurementLineRef.current.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
    measurementLineRef.current = null
  }
  
  if (measurementLabelRef.current) {
    scene.remove(measurementLabelRef.current)
    measurementLabelRef.current.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
    measurementLabelRef.current = null
  }
  
  // Create final arrow
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const arrowDirection = direction.clone().normalize()
  
  const arrowHelper = new THREE.ArrowHelper(
    arrowDirection,
    start,
    length,
    0xff0000, // Red color
    length * 0.1, // Head length (10% of total)
    length * 0.05 // Head width (5% of total)
  )
  
  arrowHelper.name = 'measurement-arrow'
  scene.add(arrowHelper)
  console.log('[MEASUREMENT] Arrow added to scene')
  
  // Calculate distance in mm
  const distance = start.distanceTo(end) * 1000 // Convert from meters to mm
  console.log('[MEASUREMENT] Distance calculated:', distance, 'mm')
  
  // Create label at midpoint
  createMeasurementLabel(start, end, distance, camera, container, measurementLabelDivRef)
  
  // Store this measurement in the all measurements array
  const measurement: MeasurementData = {
    arrow: arrowHelper,
    label: measurementLabelDivRef.current,
    dots: [...measurementDotsRef.current], // Copy the dots array
    start: start.clone(),
    end: end.clone()
  }
  allMeasurementsRef.current.push(measurement)
  
  // Clear current measurement refs (but keep the visuals in allMeasurementsRef)
  measurementLineRef.current = null
  measurementLabelDivRef.current = null
  measurementDotsRef.current = []
  measurementPointsRef.current = []
}

/**
 * Clear current in-progress measurement.
 */
export const clearMeasurement = (
  scene: THREE.Scene,
  measurementLineRef: React.MutableRefObject<THREE.Line | null>,
  measurementLabelRef: React.MutableRefObject<THREE.Group | null>,
  measurementLabelDivRef: React.MutableRefObject<HTMLDivElement | null>,
  measurementPointsRef: React.MutableRefObject<THREE.Vector3[]>,
  measurementDotsRef: React.MutableRefObject<THREE.Mesh[]>,
  previewArrowRef: React.MutableRefObject<THREE.ArrowHelper | null>,
  hoverPreviewMarkerRef: React.MutableRefObject<THREE.Sprite | null>
): void => {
  // Remove measurement arrow
  if (measurementLineRef.current) {
    scene.remove(measurementLineRef.current)
    measurementLineRef.current.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
    measurementLineRef.current = null
  }
  
  // Remove measurement label (HTML overlay)
  if (measurementLabelDivRef.current) {
    measurementLabelDivRef.current.remove()
    measurementLabelDivRef.current = null
  }
  
  // Clean up legacy sprite label if it exists
  if (measurementLabelRef.current) {
    scene.remove(measurementLabelRef.current)
    measurementLabelRef.current.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
    measurementLabelRef.current = null
  }
  
  measurementPointsRef.current = []
  
  // Remove measurement dots
  measurementDotsRef.current.forEach(dot => {
    scene.remove(dot)
    dot.geometry.dispose()
    if (dot.material) {
      if (Array.isArray(dot.material)) {
        dot.material.forEach((mat: THREE.Material) => mat.dispose())
      } else {
        dot.material.dispose()
      }
    }
  })
  measurementDotsRef.current = []
  
  // Remove preview arrow
  if (previewArrowRef.current) {
    scene.remove(previewArrowRef.current)
    previewArrowRef.current.traverse((child: THREE.Object3D) => {
      const obj = child as any
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
    previewArrowRef.current = null
  }
  
  // Hide hover preview marker
  if (hoverPreviewMarkerRef.current) {
    hoverPreviewMarkerRef.current.visible = false
  }
}

/**
 * Clear all stored measurements.
 */
export const clearAllMeasurements = (
  scene: THREE.Scene,
  allMeasurementsRef: React.MutableRefObject<MeasurementData[]>
): void => {
  // Remove all stored measurements
  allMeasurementsRef.current.forEach(measurement => {
    // Remove arrow
    if (measurement.arrow) {
      scene.remove(measurement.arrow)
      measurement.arrow.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
    
    // Remove label
    if (measurement.label) {
      measurement.label.remove()
    }
    
    // Remove dots
    measurement.dots.forEach(dot => {
      scene.remove(dot)
      dot.geometry.dispose()
      if (dot.material) {
        if (Array.isArray(dot.material)) {
          dot.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          dot.material.dispose()
        }
      }
    })
  })
  
  // Clear the array
  allMeasurementsRef.current = []
  
  console.log('[MEASUREMENT] All measurements cleared')
}

