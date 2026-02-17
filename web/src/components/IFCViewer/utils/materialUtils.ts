import * as THREE from 'three'

/**
 * Clone material safely
 */
export function cloneMaterial(
  material: THREE.Material | THREE.Material[]
): THREE.Material | THREE.Material[] {
  if (Array.isArray(material)) {
    return material.map(mat => mat.clone ? mat.clone() : mat)
  }
  return material.clone ? material.clone() : material
}

/**
 * Set material opacity
 */
export function setMaterialOpacity(
  material: THREE.Material | THREE.Material[],
  opacity: number,
  transparent: boolean = true
): void {
  const materials = Array.isArray(material) ? material : [material]
  
  materials.forEach(mat => {
    if ('opacity' in mat) {
      mat.opacity = opacity
      mat.transparent = transparent
      mat.needsUpdate = true
    }
  })
}

/**
 * Set material visibility
 */
export function setMaterialVisible(
  material: THREE.Material | THREE.Material[],
  visible: boolean
): void {
  const materials = Array.isArray(material) ? material : [material]
  
  materials.forEach(mat => {
    mat.visible = visible
    mat.needsUpdate = true
  })
}

/**
 * Create a grey material for filtering
 */
export function createGreyMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x404040,
    transparent: false,
    opacity: 1.0,
    metalness: 0.1,
    roughness: 0.8
  })
}

/**
 * Create a transparent material
 */
export function createTransparentMaterial(
  color: number = 0x808080,
  opacity: number = 0.3
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    metalness: 0.1,
    roughness: 0.8,
    side: THREE.DoubleSide
  })
}

/**
 * Create a highlight material
 */
export function createHighlightMaterial(
  color: number = 0xffff00
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: false,
    opacity: 1.0,
    metalness: 0.2,
    roughness: 0.6,
    emissive: color,
    emissiveIntensity: 0.3
  })
}

/**
 * Dispose material safely
 */
export function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material]
  materials.forEach(mat => {
    if (mat.dispose) {
      mat.dispose()
    }
  })
}

/**
 * Get material color
 */
export function getMaterialColor(material: THREE.Material | THREE.Material[]): THREE.Color | null {
  const mat = Array.isArray(material) ? material[0] : material
  
  if ('color' in mat && mat.color instanceof THREE.Color) {
    return mat.color
  }
  
  return null
}

/**
 * Set material color
 */
export function setMaterialColor(
  material: THREE.Material | THREE.Material[],
  color: THREE.Color | number
): void {
  const materials = Array.isArray(material) ? material : [material]
  
  materials.forEach(mat => {
    if ('color' in mat) {
      if (typeof color === 'number') {
        mat.color = new THREE.Color(color)
      } else {
        mat.color = color.clone()
      }
      mat.needsUpdate = true
    }
  })
}

