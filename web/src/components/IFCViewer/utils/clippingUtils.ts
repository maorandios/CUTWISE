// web/src/components/IFCViewer/utils/clippingUtils.ts
import * as THREE from 'three'
import { ClipPlaneKey, ModelBounds } from '../types'

/**
 * Disables clipping planes and removes the clipping helper visualization.
 * @param renderer The THREE.WebGLRenderer.
 * @param scene The THREE.Scene.
 * @param clippingHelper The current clipping helper group (if any).
 * @returns null (to clear the clipping helper ref).
 */
export const disableClipping = (
  renderer: THREE.WebGLRenderer | null,
  scene: THREE.Scene | null,
  clippingHelper: THREE.Group | null
): null => {
  if (!renderer) return null
  
  renderer.clippingPlanes = []
  renderer.localClippingEnabled = false
  
  // Remove helper if exists
  if (clippingHelper && scene) {
    scene.remove(clippingHelper)
    // Dispose of materials in the group and its children
    clippingHelper.traverse((child: THREE.Object3D) => {
      const obj = child as any
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose?.())
        } else {
          obj.material.dispose?.()
        }
      }
    })
  }
  
  return null
}

/**
 * Calculates the clipping plane normal and origin based on the plane key and model bounds.
 * @param planeKey The clipping plane direction.
 * @param bounds The model bounding box information.
 * @returns An object with normal, origin, and faceCenter vectors.
 */
export const calculateClippingPlaneVectors = (
  planeKey: ClipPlaneKey,
  bounds: ModelBounds
): { normal: THREE.Vector3; origin: THREE.Vector3; faceCenter: THREE.Vector3 } => {
  const { min, max, center } = bounds
  const normal = new THREE.Vector3()
  const faceCenter = new THREE.Vector3()
  const origin = new THREE.Vector3()
  
  switch (planeKey) {
    case 'left': // clip from left face toward +X
      normal.set(1, 0, 0)
      faceCenter.set(min.x, center.y, center.z)
      origin.set(min.x, center.y, center.z)
      break
    case 'right': // clip from right face toward -X
      normal.set(-1, 0, 0)
      faceCenter.set(max.x, center.y, center.z)
      origin.set(max.x, center.y, center.z)
      break
    case 'bottom': // clip from bottom face toward +Y
      normal.set(0, 1, 0)
      faceCenter.set(center.x, min.y, center.z)
      origin.set(center.x, min.y, center.z)
      break
    case 'top': // clip from top face toward -Y
      normal.set(0, -1, 0)
      faceCenter.set(center.x, max.y, center.z)
      origin.set(center.x, max.y, center.z)
      break
    case 'back': // clip from back face toward +Z
      normal.set(0, 0, 1)
      faceCenter.set(center.x, center.y, min.z)
      origin.set(center.x, center.y, min.z)
      break
    case 'front': // clip from front face toward -Z
      normal.set(0, 0, -1)
      faceCenter.set(center.x, center.y, max.z)
      origin.set(center.x, center.y, max.z)
      break
  }
  
  return { normal, origin, faceCenter }
}

/**
 * Calculates the distance to move the clipping plane inward from the face.
 * @param planeKey The clipping plane direction.
 * @param size The model size vector.
 * @param amount The normalized clipping amount (0 to 1).
 * @returns The distance in world units.
 */
export const calculateClippingDistance = (
  planeKey: ClipPlaneKey,
  size: THREE.Vector3,
  amount: number
): number => {
  switch (planeKey) {
    case 'left':
    case 'right':
      return size.x * amount
    case 'bottom':
    case 'top':
      return size.y * amount
    case 'back':
    case 'front':
      return size.z * amount
    default:
      return 0
  }
}

/**
 * Creates a visual helper to show the clipping plane position.
 * @param faceCenter The center point of the face where the plane is positioned.
 * @param normal The normal vector of the clipping plane.
 * @param helperSize The size of the helper plane visualization.
 * @returns A THREE.Group containing the helper visualization.
 */
export const createClippingHelper = (
  faceCenter: THREE.Vector3,
  normal: THREE.Vector3,
  helperSize: number
): THREE.Group => {
  const helperGroup = new THREE.Group()
  helperGroup.name = 'clipping-plane-helper'
  helperGroup.position.copy(faceCenter)
  
  // Create a plane geometry - default is in XY plane (normal = +Z)
  const planeGeometry = new THREE.PlaneGeometry(helperSize, helperSize)
  
  // Calculate rotation to align the plane normal with our desired normal
  const defaultNormal = new THREE.Vector3(0, 0, 1)
  const quaternion = new THREE.Quaternion()
  quaternion.setFromUnitVectors(defaultNormal, normal)
  
  // Create material that's always visible and not affected by clipping
  const helperMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
    clippingPlanes: [] // Explicitly exclude from clipping
  })
  
  const planeMesh = new THREE.Mesh(planeGeometry, helperMaterial)
  planeMesh.quaternion.copy(quaternion)
  planeMesh.renderOrder = 999 // Render on top
  
  // Also add edge lines for better visibility
  const edges = new THREE.EdgesGeometry(planeGeometry)
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 2,
    clippingPlanes: [] // Explicitly exclude from clipping
  })
  const edgeLines = new THREE.LineSegments(edges, edgeMaterial)
  edgeLines.quaternion.copy(quaternion)
  
  helperGroup.add(planeMesh)
  helperGroup.add(edgeLines)
  
  return helperGroup
}

/**
 * Updates the model bounds by recalculating the bounding box.
 * @param model The THREE.Group representing the model.
 * @returns The updated ModelBounds or null if the box is empty.
 */
export const updateModelBounds = (model: THREE.Group): ModelBounds | null => {
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  
  if (box.isEmpty()) {
    return null
  }
  
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  
  return {
    min: box.min.clone(),
    max: box.max.clone(),
    size: size.clone(),
    center: center.clone()
  }
}

/**
 * Applies a clipping plane to the renderer based on the selected plane and amount.
 * @param renderer The THREE.WebGLRenderer.
 * @param scene The THREE.Scene.
 * @param model The THREE.Group representing the model.
 * @param planeKey The clipping plane direction.
 * @param amount The normalized clipping amount (0 to 1).
 * @param currentPlane The current THREE.Plane (if any).
 * @param currentHelper The current clipping helper group (if any).
 * @returns An object with the updated plane and helper.
 */
export const applyClipping = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  model: THREE.Group,
  planeKey: ClipPlaneKey,
  amount: number,
  currentPlane: THREE.Plane | null,
  currentHelper: THREE.Group | null
): { plane: THREE.Plane; helper: THREE.Group } | null => {
  const bounds = updateModelBounds(model)
  if (!bounds) return null
  
  const { size } = bounds
  const clampedAmount = Math.min(Math.max(amount, 0), 1)
  
  // Calculate plane vectors
  const { normal, origin, faceCenter } = calculateClippingPlaneVectors(planeKey, bounds)
  
  // Move inward from the face based on amount
  const distance = calculateClippingDistance(planeKey, size, clampedAmount)
  origin.addScaledVector(normal, distance)
  
  // Create or update the clipping plane
  const plane = currentPlane ?? new THREE.Plane()
  plane.set(normal, -normal.dot(origin))
  
  // Enable clipping only when amount > 0
  if (clampedAmount > 0) {
    renderer.clippingPlanes = [plane]
    renderer.localClippingEnabled = true
  } else {
    renderer.clippingPlanes = []
    renderer.localClippingEnabled = false
  }
  
  // Remove old helper if exists
  if (currentHelper) {
    scene.remove(currentHelper)
    currentHelper.traverse((child: THREE.Object3D) => {
      const obj = child as any
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose?.())
        } else {
          obj.material.dispose?.()
        }
      }
    })
  }
  
  // Create new helper
  const helperSize = Math.max(size.x, size.y, size.z) * 1.5 || 1
  const helper = createClippingHelper(faceCenter, normal, helperSize)
  scene.add(helper)
  
  return { plane, helper }
}

