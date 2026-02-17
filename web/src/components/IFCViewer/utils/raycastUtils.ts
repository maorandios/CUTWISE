import * as THREE from 'three'

/**
 * Create and configure a raycaster from camera and mouse coordinates
 */
export function createRaycaster(
  mouseX: number,
  mouseY: number,
  camera: THREE.Camera
): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)
  return raycaster
}

/**
 * Convert client coordinates to normalized device coordinates (-1 to +1)
 */
export function clientToNDC(
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } {
  const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1
  const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1
  return { x: mouseX, y: mouseY }
}

/**
 * Get pickable meshes from a model (excludes helpers, lines, edges)
 */
export function getPickableMeshes(model: THREE.Object3D): THREE.Mesh[] {
  const pickables: THREE.Mesh[] = []
  
  model.traverse((child: any) => {
    if (child.isMesh && child.visible) {
      // Skip edge lines, line segments, and helper objects
      if (!child.isLine && 
          !child.isLineSegments && 
          !(child.name && child.name.includes('_edges')) &&
          !child.name.includes('helper') &&
          !child.name.includes('measurement')) {
        pickables.push(child)
      }
    }
  })
  
  return pickables
}

/**
 * Perform raycast and get intersections with pickable objects
 */
export function raycastPickables(
  mouseX: number,
  mouseY: number,
  camera: THREE.Camera,
  model: THREE.Object3D
): THREE.Intersection[] {
  const raycaster = createRaycaster(mouseX, mouseY, camera)
  const pickables = getPickableMeshes(model)
  return raycaster.intersectObjects(pickables, false)
}

/**
 * Find the best mesh intersection (filters out non-mesh objects)
 */
export function findBestMeshIntersection(
  intersections: THREE.Intersection[]
): { intersection: THREE.Intersection; mesh: THREE.Mesh } | null {
  for (const intersection of intersections) {
    const obj = intersection.object as any
    
    // Skip edge lines and helpers
    if (obj.isLine || obj.isLineSegments) continue
    if (obj.name && (obj.name.includes('_edges') || obj.name.includes('helper'))) continue
    
    // Found a valid mesh
    if (obj.isMesh) {
      return { intersection, mesh: obj as THREE.Mesh }
    }
  }
  
  return null
}

/**
 * Raycast and find the first valid mesh intersection
 */
export function raycastForMesh(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  model: THREE.Object3D,
  containerRect: DOMRect
): { intersection: THREE.Intersection; mesh: THREE.Mesh } | null {
  const ndc = clientToNDC(clientX, clientY, containerRect)
  const intersections = raycastPickables(ndc.x, ndc.y, camera, model)
  return findBestMeshIntersection(intersections)
}

