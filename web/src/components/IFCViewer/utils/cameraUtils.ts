// web/src/components/IFCViewer/utils/cameraUtils.ts
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Create and configure a perspective camera.
 */
export const createCamera = (
  width: number,
  height: number
): THREE.PerspectiveCamera => {
  const camera = new THREE.PerspectiveCamera(
    75,
    width / height,
    0.01,  // Near plane - small but not extreme to prevent clipping issues
    10000  // Increased far plane for large models
  )
  camera.updateProjectionMatrix()
  // Initial camera position (will be adjusted when model loads)
  camera.position.set(10, 10, 10)
  camera.up.set(0, 1, 0)  // Ensure Y-up coordinate system
  camera.lookAt(0, 0, 0)
  return camera
}

/**
 * Create and configure orbit controls for the camera.
 */
export const createOrbitControls = (
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls => {
  const controls = new OrbitControls(camera, domElement)
  
  // DISABLE damping for instant mouse response (no lag/delay)
  controls.enableDamping = false  // Instant response, no smoothing delay
  
  // Enable all controls
  controls.enablePan = true
  controls.enableZoom = true  // Enable default zoom (dolly to target only)
  controls.enableRotate = true
  
  // Fast, responsive speeds for instant feedback
  controls.rotateSpeed = 1.5  // Fast rotation - moves with mouse speed
  controls.panSpeed = 1.0     // Fast pan - responsive movement
  controls.zoomSpeed = 1.8    // Faster zoom - quick in/out
  
  // Sensible distance limits - allow very close zooming to elements
  controls.minDistance = 0.01  // Allow close zoom but not extreme (prevents clipping issues)
  controls.maxDistance = 10000  // Maximum zoom distance
  
  // Enable zoom to cursor - zoom will follow the cursor location on the view
  controls.zoomToCursor = true
  
  // Pan in world space for correct axis movement
  controls.screenSpacePanning = false
  
  // Rotation constraints - prevent flipping and maintain stability
  controls.minPolarAngle = 0      // Allow looking from top
  controls.maxPolarAngle = Math.PI // Allow looking from bottom
  
  // Mouse button mappings - Custom configuration
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,     // Left-drag: rotate (orbit around model)
    MIDDLE: THREE.MOUSE.PAN,      // Middle-drag: pan (move view)
    RIGHT: null                    // Right-click: disabled (reserved for context menu)
  }
  
  controls.target.set(0, 0, 0)
  
  return controls
}

/**
 * Fit camera to model bounding box with isometric view.
 */
export const fitCameraToModel = (
  model: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  directionalLight1?: THREE.DirectionalLight,
  directionalLight2?: THREE.DirectionalLight
): { center: THREE.Vector3; size: THREE.Vector3; box: THREE.Box3 } | null => {
  // Calculate bounding box in world space
  const box = new THREE.Box3()
  box.setFromObject(model)
  
  // Get center and size
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  console.log('[CameraUtils] Model bounding box - Center:', center, 'Size:', size)
  console.log('[CameraUtils] Model bounds - Min:', box.min, 'Max:', box.max)
  
  const maxDim = Math.max(size.x, size.y, size.z)
  console.log('[CameraUtils] Max dimension:', maxDim)
  
  if (maxDim > 0) {
    // Calculate appropriate camera distance
    const fov = camera.fov * (Math.PI / 180)
    const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.8 // Add padding
    
    // Update shadow camera settings based on model size for better shadow coverage
    if (directionalLight1) {
      const shadowRange = maxDim * 2
      directionalLight1.shadow.camera.left = -shadowRange
      directionalLight1.shadow.camera.right = shadowRange
      directionalLight1.shadow.camera.top = shadowRange
      directionalLight1.shadow.camera.bottom = -shadowRange
      directionalLight1.shadow.camera.near = 0.1
      directionalLight1.shadow.camera.far = maxDim * 3
      directionalLight1.shadow.camera.updateProjectionMatrix()
    }
    
    if (directionalLight2) {
      const shadowRange = maxDim * 2
      directionalLight2.shadow.camera.left = -shadowRange
      directionalLight2.shadow.camera.right = shadowRange
      directionalLight2.shadow.camera.top = shadowRange
      directionalLight2.shadow.camera.bottom = -shadowRange
      directionalLight2.shadow.camera.near = 0.1
      directionalLight2.shadow.camera.far = maxDim * 3
      directionalLight2.shadow.camera.updateProjectionMatrix()
    }
    
    // Position camera for standard isometric view (ground-up perspective)
    // Standard isometric: 45° in XZ plane, ~35° elevation
    const isometricAngle = Math.PI / 4  // 45 degrees in horizontal plane
    const elevationAngle = Math.PI / 5   // ~36 degrees elevation
    
    const horizontalDist = distance * Math.cos(elevationAngle)
    const verticalDist = distance * Math.sin(elevationAngle)
    
    // Position camera: isometric view from above and to the side
    const cameraPos = new THREE.Vector3(
      center.x + horizontalDist * Math.cos(isometricAngle),
      center.y + verticalDist,  // Elevated to see model from above
      center.z + horizontalDist * Math.sin(isometricAngle)
    )
    
    camera.position.copy(cameraPos)
    console.log('[CameraUtils] Camera positioned at:', cameraPos)
    
    // CRITICAL: Ensure Y is always up (ground-up coordinate system)
    camera.up.set(0, 1, 0)
    
    // Set controls target to model center
    controls.target.copy(center)
    console.log('[CameraUtils] Camera target set to:', center)
    
    // Make sure camera looks at center (this respects the up vector)
    camera.lookAt(center)
    
    // Force update the camera matrix to ensure up vector is respected
    camera.updateMatrixWorld()
    
    // Update controls to apply changes
    controls.update()
  }
  
  return { center, size, box }
}

/**
 * Animate pivot transition smoothly.
 * Returns true if animation is still in progress, false if complete.
 */
export const animatePivotTransition = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  animationStartTime: number,
  oldTarget: THREE.Vector3,
  oldCameraPos: THREE.Vector3,
  targetPivot: THREE.Vector3,
  duration: number = 150
): boolean => {
  const elapsed = performance.now() - animationStartTime
  const progress = Math.min(elapsed / duration, 1.0)
  
  // Use easing function for smooth transition (ease-out cubic)
  const eased = 1 - Math.pow(1 - progress, 3)
  
  // Calculate the offset from old target to new pivot
  const targetOffset = new THREE.Vector3().subVectors(targetPivot, oldTarget)
  
  // Interpolate target
  controls.target.copy(oldTarget).add(targetOffset.clone().multiplyScalar(eased))
  
  // Interpolate camera position - move by the SAME offset to maintain view
  camera.position.copy(oldCameraPos).add(targetOffset.clone().multiplyScalar(eased))
  
  camera.updateMatrixWorld()
  
  // Update OrbitControls internal state continuously during animation
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
  const spherical = new THREE.Spherical()
  spherical.setFromVector3(offset)
  
  const controlsAny = controls as any
  if (controlsAny.spherical) {
    controlsAny.spherical.copy(spherical)
  }
  if (controlsAny.target0) {
    controlsAny.target0.copy(controls.target)
  }
  if (controlsAny.position0) {
    controlsAny.position0.copy(camera.position)
  }
  if (controlsAny.offset) {
    controlsAny.offset.copy(offset)
  }
  
  // End animation when complete
  if (progress >= 1.0) {
    // Reset mouse tracking to prevent jump on first move after animation
    if (controlsAny.rotateStart) {
      controlsAny.rotateStart.set(0, 0)
    }
    if (controlsAny.rotateEnd) {
      controlsAny.rotateEnd.set(0, 0)
    }
    if (controlsAny.panStart) {
      controlsAny.panStart.set(0, 0)
    }
    if (controlsAny.panEnd) {
      controlsAny.panEnd.set(0, 0)
    }
    return false // Animation complete
  }
  
  return true // Animation still in progress
}

/**
 * Start pivot animation by storing initial state.
 */
export const startPivotAnimation = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPivot: THREE.Vector3
): {
  animationStartTime: number
  oldTarget: THREE.Vector3
  oldCameraPos: THREE.Vector3
  targetPivot: THREE.Vector3
} => {
  return {
    animationStartTime: performance.now(),
    oldTarget: controls.target.clone(),
    oldCameraPos: camera.position.clone(),
    targetPivot: targetPivot.clone()
  }
}

