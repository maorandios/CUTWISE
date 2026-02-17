import * as THREE from 'three'

/**
 * Find the closest corner (vertex) to the intersection point within snap distance
 */
export function findClosestCorner(
  intersection: THREE.Intersection,
  model: THREE.Group | null,
  snapDistance: number
): THREE.Vector3 | null {
  if (!model || !intersection.object || !intersection.face) return null
  
  const hitPoint = intersection.point
  const hitObject = intersection.object as THREE.Mesh
  
  // Get the geometry
  const geometry = hitObject.geometry
  if (!geometry || !geometry.attributes.position) return null
  
  // Get face vertices
  const face = intersection.face
  const positions = geometry.attributes.position
  
  // Check all three vertices of the face
  const vertices = [
    new THREE.Vector3().fromBufferAttribute(positions, face.a),
    new THREE.Vector3().fromBufferAttribute(positions, face.b),
    new THREE.Vector3().fromBufferAttribute(positions, face.c)
  ]
  
  // Transform vertices to world space
  vertices.forEach(v => v.applyMatrix4(hitObject.matrixWorld))
  
  let closestVertex: THREE.Vector3 | null = null
  let minDistance = snapDistance
  
  vertices.forEach(vertex => {
    const distance = hitPoint.distanceTo(vertex)
    if (distance < minDistance) {
      minDistance = distance
      closestVertex = vertex.clone()
    }
  })
  
  return closestVertex
}

/**
 * Find the closest point on an edge for snapping
 */
export function findClosestEdgePoint(
  intersection: THREE.Intersection,
  model: THREE.Group | null,
  snapDistance: number
): THREE.Vector3 | null {
  if (!model || !intersection.object || !intersection.face) return null
  
  const hitPoint = intersection.point
  const hitObject = intersection.object as THREE.Mesh
  
  // Get the geometry
  const geometry = hitObject.geometry
  if (!geometry || !geometry.attributes.position) return null
  
  // Get face vertices
  const face = intersection.face
  const positions = geometry.attributes.position
  const vA = new THREE.Vector3().fromBufferAttribute(positions, face.a)
  const vB = new THREE.Vector3().fromBufferAttribute(positions, face.b)
  const vC = new THREE.Vector3().fromBufferAttribute(positions, face.c)
  
  // Transform vertices to world space
  vA.applyMatrix4(hitObject.matrixWorld)
  vB.applyMatrix4(hitObject.matrixWorld)
  vC.applyMatrix4(hitObject.matrixWorld)
  
  // Check each edge of the triangle
  const edges = [
    [vA.clone(), vB.clone()],
    [vB.clone(), vC.clone()],
    [vC.clone(), vA.clone()]
  ]
  
  let closestPoint: THREE.Vector3 | null = null
  let minDistance = snapDistance
  
  edges.forEach(([v1, v2]) => {
    // Find closest point on edge segment
    const edge = new THREE.Vector3().subVectors(v2, v1)
    const toPoint = new THREE.Vector3().subVectors(hitPoint, v1)
    const edgeLength = edge.length()
    
    if (edgeLength > 0) {
      const t = Math.max(0, Math.min(1, toPoint.dot(edge) / (edgeLength * edgeLength)))
      const pointOnEdge = new THREE.Vector3().addVectors(v1, edge.clone().multiplyScalar(t))
      
      const distance = hitPoint.distanceTo(pointOnEdge)
      if (distance < minDistance) {
        minDistance = distance
        closestPoint = pointOnEdge.clone()
      }
    }
  })
  
  return closestPoint
}

/**
 * Calculate dot size for fixed pixel size based on camera distance
 */
export function calculateDotSize(
  point: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  containerHeight: number,
  pixelSize: number = 8
): number {
  const distanceToCamera = camera.position.distanceTo(point)
  const fov = camera.fov * (Math.PI / 180)
  const height = 2 * Math.tan(fov / 2) * distanceToCamera
  const pixelToWorld = height / containerHeight
  return pixelSize * pixelToWorld
}

/**
 * Create a measurement dot mesh at a point
 */
export function createMeasurementDot(
  point: THREE.Vector3,
  size: number,
  color: number = 0xff0000
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(size, 16, 16)
  const material = new THREE.MeshBasicMaterial({ 
    color,
    transparent: false
  })
  const dot = new THREE.Mesh(geometry, material)
  dot.position.copy(point)
  dot.name = 'measurement-dot'
  
  return dot
}

/**
 * Create an arrow helper from start to end point
 */
export function createArrowHelper(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number = 0xff0000,
  headLengthRatio: number = 0.1,
  headWidthRatio: number = 0.05
): THREE.ArrowHelper {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const arrowDirection = direction.clone().normalize()
  
  const arrowHelper = new THREE.ArrowHelper(
    arrowDirection,
    start,
    length,
    color,
    length * headLengthRatio,
    length * headWidthRatio
  )
  
  arrowHelper.name = 'measurement-arrow'
  return arrowHelper
}

/**
 * Calculate distance between two points in millimeters
 */
export function calculateDistance(start: THREE.Vector3, end: THREE.Vector3): number {
  return start.distanceTo(end) * 1000 // Convert from meters to mm
}

/**
 * Format distance for display (mm or m)
 */
export function formatDistance(distanceInMm: number): string {
  if (distanceInMm >= 1000) {
    return `${(distanceInMm / 1000).toFixed(2)} m`
  } else {
    return `${distanceInMm.toFixed(0)} mm`
  }
}

/**
 * Calculate midpoint between two vectors
 */
export function calculateMidpoint(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
}

/**
 * Project 3D point to 2D screen coordinates
 */
export function projectToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  const vector = point.clone()
  vector.project(camera)
  
  return {
    x: (vector.x + 1) / 2 * containerWidth,
    y: -(vector.y - 1) / 2 * containerHeight
  }
}

/**
 * Dispose of Three.js object and its resources
 */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child: THREE.Object3D) => {
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
}

/**
 * Find all meshes with specific product IDs
 */
export function findMeshesByProductIds(
  model: THREE.Object3D,
  productIds: number[]
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  const productIdSet = new Set(productIds)
  
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const productId = child.userData?.product_id
      if (productId !== undefined && productIdSet.has(productId)) {
        meshes.push(child)
      }
    }
  })
  
  return meshes
}

/**
 * Get assembly information from a mesh
 */
export function getAssemblyInfo(mesh: THREE.Mesh): { mark: string | null; assemblyId: number | null } {
  const mark = mesh.userData?.assembly_mark || null
  const assemblyId = mesh.userData?.assembly_id || null
  return { mark, assemblyId }
}

/**
 * Find all meshes with a specific assembly ID
 */
export function findAllMeshesWithAssemblyId(
  model: THREE.Object3D,
  assemblyId: number | null
): THREE.Mesh[] {
  if (assemblyId === null) return []
  
  const meshes: THREE.Mesh[] = []
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const childAssemblyId = child.userData?.assembly_id
      if (childAssemblyId === assemblyId) {
        meshes.push(child)
      }
    }
  })
  
  return meshes
}

