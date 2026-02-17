// web/src/components/IFCViewer/utils/visibilityUtils.ts
import * as THREE from 'three'
import { findMeshesByProductIds } from './geometryUtils'

interface VisibilityRefs {
  elementStatesRef: React.MutableRefObject<Map<THREE.Mesh, 'normal' | 'transparent' | 'hidden'>>
  originalMaterialsRef: React.MutableRefObject<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>
  originalVisibilityRef: React.MutableRefObject<Map<THREE.Mesh, boolean>>
}

/**
 * Toggle transparency for selected meshes.
 * If already transparent, restore to normal. If normal, make transparent.
 */
export const handleTransparent = (
  model: THREE.Object3D | null,
  selectedProductIds: number[],
  selectedMeshes: THREE.Mesh[],
  refs: VisibilityRefs
) => {
  console.log('[handleTransparent] Called')
  console.log('[handleTransparent] selectedProductIds:', selectedProductIds)
  console.log('[handleTransparent] selectedMeshes:', selectedMeshes.map(m => ({
    name: m.name,
    productId: m.userData?.product_id || m.userData?.expressID || m.userData?.id,
    visible: m.visible
  })))
  
  if (!model) {
    console.warn('[handleTransparent] No model available')
    return
  }
  
  const productIds = selectedProductIds.length > 0 
    ? selectedProductIds 
    : selectedMeshes.map(m => 
        m.userData?.product_id || m.userData?.expressID || m.userData?.id || ((m as any).metadata?.product_id)
      ).filter(id => id !== undefined && id !== null) as number[]
  
  console.log('[handleTransparent] Extracted product IDs:', productIds)
  
  if (productIds.length === 0) {
    console.warn('[handleTransparent] No product IDs found for transparent operation')
    return
  }
  
  const meshesToProcess = findMeshesByProductIds(model, productIds)
  
  if (meshesToProcess.length === 0) {
    console.warn(`[handleTransparent] No meshes found for product IDs: ${productIds.join(', ')}`)
    return
  }
  
  console.log(`[handleTransparent] Making ${meshesToProcess.length} mesh(es) transparent (product IDs: ${productIds.join(', ')})`)
  
  meshesToProcess.forEach((mesh, index) => {
    console.log(`[handleTransparent] Processing mesh ${index + 1}/${meshesToProcess.length}:`, {
      name: mesh.name,
      productId: mesh.userData?.product_id || mesh.userData?.expressID,
      currentVisible: mesh.visible,
      currentMaterial: Array.isArray(mesh.material) ? mesh.material[0]?.type : mesh.material?.type,
      currentState: refs.elementStatesRef.current.get(mesh)
    })
    if (!mesh) return
    
    const currentState = refs.elementStatesRef.current.get(mesh)
    
    let actualMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (mesh.userData && mesh.userData._originalMaterial) {
      const origMat = Array.isArray(mesh.userData._originalMaterial) ? mesh.userData._originalMaterial[0] : mesh.userData._originalMaterial
      if (origMat) {
        actualMaterial = origMat
      }
    }
    
    const isMaterialTransparent = actualMaterial && 
                                  actualMaterial.transparent === true && 
                                  actualMaterial.opacity !== undefined && 
                                  actualMaterial.opacity < 1.0 &&
                                  actualMaterial.opacity > 0
    
    console.log(`[handleTransparent] State check:`, {
      currentState,
      isMaterialTransparent,
      materialTransparent: actualMaterial?.transparent,
      materialOpacity: actualMaterial?.opacity,
      hasOriginalMaterial: refs.originalMaterialsRef.current.has(mesh)
    })
    
    if (currentState === 'transparent' || (currentState !== 'hidden' && isMaterialTransparent)) {
      if (currentState !== 'transparent' && isMaterialTransparent) {
        refs.elementStatesRef.current.set(mesh, 'transparent')
        if (!refs.originalMaterialsRef.current.has(mesh)) {
          if (actualMaterial && typeof actualMaterial.clone === 'function') {
            const restoredMat = actualMaterial.clone()
            restoredMat.transparent = false
            restoredMat.opacity = 1.0
            refs.originalMaterialsRef.current.set(mesh, restoredMat)
          }
        }
      }
      console.log(`[handleTransparent] Mesh ${mesh.name} is already transparent, restoring to normal`)
      
      if (refs.originalMaterialsRef.current.has(mesh)) {
        const originalMat = refs.originalMaterialsRef.current.get(mesh)
        if (originalMat) {
          const mat = Array.isArray(originalMat) ? originalMat[0] : originalMat
          if (mat && typeof mat.clone === 'function') {
            const restoredMat = mat.clone()
            restoredMat.transparent = false
            restoredMat.opacity = 1.0
            mesh.material = restoredMat
          } else {
            mesh.material = originalMat
            const currentMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
            if (currentMat) {
              currentMat.transparent = false
              currentMat.opacity = 1.0
            }
          }
        }
        refs.originalMaterialsRef.current.delete(mesh)
      } else {
        const currentMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        if (currentMat) {
          if (typeof currentMat.clone === 'function') {
            const restoredMat = currentMat.clone()
            restoredMat.transparent = false
            restoredMat.opacity = 1.0
            mesh.material = restoredMat
          } else {
            currentMat.transparent = false
            currentMat.opacity = 1.0
          }
        }
      }
      
      if (refs.originalVisibilityRef.current.has(mesh)) {
        mesh.visible = refs.originalVisibilityRef.current.get(mesh) ?? true
        refs.originalVisibilityRef.current.delete(mesh)
      } else {
        mesh.visible = true
      }
      
      refs.elementStatesRef.current.set(mesh, 'normal')
      
      if (mesh.userData && mesh.userData._originalMaterial) {
        const storedMat = Array.isArray(mesh.userData._originalMaterial) ? mesh.userData._originalMaterial[0] : mesh.userData._originalMaterial
        if (storedMat && storedMat.transparent === true && storedMat.opacity < 1.0) {
          mesh.userData._originalMaterial = mesh.material
        } else {
          delete mesh.userData._originalMaterial
        }
      }
      
      if (mesh.userData?.edgeLine) {
        const edgeLine = mesh.userData.edgeLine
        if (refs.originalVisibilityRef.current.has(edgeLine)) {
          edgeLine.visible = refs.originalVisibilityRef.current.get(edgeLine) ?? true
          refs.originalVisibilityRef.current.delete(edgeLine)
        } else {
          edgeLine.visible = true
        }
        if (edgeLine.material) {
          edgeLine.material.transparent = false
          edgeLine.material.opacity = 1.0
        }
      }
      
      console.log(`[handleTransparent] Restored mesh to normal:`, {
        name: mesh.name,
        visible: mesh.visible,
        material: Array.isArray(mesh.material) ? mesh.material[0]?.type : mesh.material?.type,
        materialOpacity: Array.isArray(mesh.material) ? mesh.material[0]?.opacity : mesh.material?.opacity,
        materialTransparent: Array.isArray(mesh.material) ? mesh.material[0]?.transparent : mesh.material?.transparent,
        state: refs.elementStatesRef.current.get(mesh)
      })
      return
    }
    
    let baseMaterial = mesh.material
    if (mesh.userData && mesh.userData._originalMaterial) {
      baseMaterial = mesh.userData._originalMaterial
    }
    
    if (!refs.originalMaterialsRef.current.has(mesh)) {
      refs.originalMaterialsRef.current.set(mesh, baseMaterial)
    }
    
    if (!refs.originalVisibilityRef.current.has(mesh)) {
      refs.originalVisibilityRef.current.set(mesh, mesh.visible)
    }
    
    const material = Array.isArray(baseMaterial) ? baseMaterial[0] : baseMaterial
    if (material) {
      const transparentMat = material.clone()
      transparentMat.transparent = true
      transparentMat.opacity = 0.3
      mesh.material = transparentMat
    }
    
    mesh.visible = true
    refs.elementStatesRef.current.set(mesh, 'transparent')
    console.log(`[handleTransparent] Applied transparency to mesh:`, {
      name: mesh.name,
      opacity: (mesh.material as any)?.opacity,
      transparent: (mesh.material as any)?.transparent,
      visible: mesh.visible
    })
  })
  
  meshesToProcess.forEach((mesh, index) => {
    console.log(`[handleTransparent] Processing edge line ${index + 1}/${meshesToProcess.length} for mesh:`, mesh.name)
    if (mesh && mesh.userData?.edgeLine) {
      const edgeLine = mesh.userData.edgeLine
      if (!refs.originalVisibilityRef.current.has(edgeLine)) {
        refs.originalVisibilityRef.current.set(edgeLine, edgeLine.visible)
      }
      edgeLine.visible = true
      if (edgeLine.material) {
        edgeLine.material.transparent = true
        edgeLine.material.opacity = 0.3
      }
    }
  })
}

/**
 * Hide selected meshes.
 */
export const handleHide = (
  model: THREE.Object3D | null,
  selectedProductIds: number[],
  selectedMeshes: THREE.Mesh[],
  refs: VisibilityRefs
) => {
  console.log('[handleHide] Called')
  console.log('[handleHide] selectedProductIds:', selectedProductIds)
  console.log('[handleHide] selectedMeshes:', selectedMeshes.map(m => ({
    name: m.name,
    productId: m.userData?.product_id || m.userData?.expressID || m.userData?.id,
    visible: m.visible
  })))
  
  if (!model) {
    console.warn('[handleHide] No model available')
    return
  }
  
  const productIds = selectedProductIds.length > 0 
    ? selectedProductIds 
    : selectedMeshes.map(m => 
        m.userData?.product_id || m.userData?.expressID || m.userData?.id || ((m as any).metadata?.product_id)
      ).filter(id => id !== undefined && id !== null) as number[]
  
  console.log('[handleHide] Extracted product IDs:', productIds)
  
  if (productIds.length === 0) {
    console.warn('[handleHide] No product IDs found for hide operation')
    return
  }
  
  const meshesToProcess = findMeshesByProductIds(model, productIds)
  
  if (meshesToProcess.length === 0) {
    console.warn(`[handleHide] No meshes found for product IDs: ${productIds.join(', ')}`)
    return
  }
  
  console.log(`[handleHide] Hiding ${meshesToProcess.length} mesh(es) (product IDs: ${productIds.join(', ')})`)
  
  meshesToProcess.forEach((mesh, index) => {
    console.log(`[handleHide] Processing mesh ${index + 1}/${meshesToProcess.length}:`, {
      name: mesh.name,
      productId: mesh.userData?.product_id || mesh.userData?.expressID,
      currentVisible: mesh.visible
    })
    if (!mesh) return
    
    if (!refs.originalVisibilityRef.current.has(mesh)) {
      refs.originalVisibilityRef.current.set(mesh, mesh.visible)
    }
    
    mesh.visible = false
    refs.elementStatesRef.current.set(mesh, 'hidden')
    console.log(`[handleHide] Hidden mesh:`, {
      name: mesh.name,
      visible: mesh.visible,
      state: refs.elementStatesRef.current.get(mesh)
    })
    
    if (mesh.userData?.edgeLine) {
      const edgeLine = mesh.userData.edgeLine
      if (!refs.originalVisibilityRef.current.has(edgeLine)) {
        refs.originalVisibilityRef.current.set(edgeLine, edgeLine.visible)
      }
      edgeLine.visible = false
      console.log(`[handleHide] Hidden edge line for mesh:`, mesh.name)
    }
  })
}

/**
 * Hide all meshes except selected ones.
 */
export const handleHideAllExcept = (
  model: THREE.Object3D | null,
  selectedProductIds: number[],
  selectedMeshes: THREE.Mesh[],
  refs: VisibilityRefs
) => {
  console.log('[handleHideAllExcept] Called')
  console.log('[handleHideAllExcept] selectedProductIds:', selectedProductIds)
  console.log('[handleHideAllExcept] selectedMeshes:', selectedMeshes.map(m => ({
    name: m.name,
    productId: m.userData?.product_id || m.userData?.expressID || m.userData?.id,
    visible: m.visible
  })))
  
  if (!model) {
    console.warn('[handleHideAllExcept] No model available')
    return
  }
  
  const productIds = selectedProductIds.length > 0 
    ? selectedProductIds 
    : selectedMeshes.map(m => 
        m.userData?.product_id || m.userData?.expressID || m.userData?.id || ((m as any).metadata?.product_id)
      ).filter(id => id !== undefined && id !== null) as number[]
  
  console.log('[handleHideAllExcept] Extracted product IDs:', productIds)
  
  if (productIds.length === 0) {
    console.warn('[handleHideAllExcept] No product IDs found for hide all except operation')
    return
  }
  
  const meshesToProcess = findMeshesByProductIds(model, productIds)
  
  if (meshesToProcess.length === 0) {
    console.warn(`[handleHideAllExcept] No meshes found for product IDs: ${productIds.join(', ')}`)
    return
  }
  
  console.log(`[handleHideAllExcept] Hiding all except ${meshesToProcess.length} selected mesh(es) (product IDs: ${productIds.join(', ')})`)
  
  const selectedMeshSet = new Set(meshesToProcess)
  const selectedProductIdSet = new Set(productIds)
  let hiddenCount = 0
  let keptVisibleCount = 0
  
  model.traverse((child: any) => {
    if (child.isMesh) {
      const productId = child.userData?.product_id || 
                       child.userData?.expressID || 
                       child.userData?.id ||
                       ((child as any).metadata?.product_id)
      
      const isSelected = selectedMeshSet.has(child) || (productId && selectedProductIdSet.has(productId))
      
      if (!isSelected) {
        if (!refs.originalVisibilityRef.current.has(child)) {
          refs.originalVisibilityRef.current.set(child, child.visible)
        }
        
        child.visible = false
        refs.elementStatesRef.current.set(child, 'hidden')
        hiddenCount++
        
        if (child.userData?.edgeLine) {
          const edgeLine = child.userData.edgeLine
          if (!refs.originalVisibilityRef.current.has(edgeLine)) {
            refs.originalVisibilityRef.current.set(edgeLine, edgeLine.visible)
          }
          edgeLine.visible = false
        }
      } else {
        keptVisibleCount++
      }
    }
  })
  
  console.log(`[handleHideAllExcept] Completed: hidden ${hiddenCount} meshes, kept ${keptVisibleCount} visible`)
}

/**
 * Show all meshes and reset all states.
 */
export const handleShowAll = (
  model: THREE.Object3D | null,
  refs: VisibilityRefs
) => {
  console.log('[handleShowAll] Called')
  
  if (!model) {
    console.warn('[handleShowAll] No model available')
    return
  }
  
  let restoredCount = 0
  
  model.traverse((child: any) => {
    if (child.isMesh) {
      if (child.userData && child.userData._originalMaterial) {
        child.material = child.userData._originalMaterial
        delete child.userData._originalMaterial
      }
      
      if (refs.originalMaterialsRef.current.has(child)) {
        const originalMat = refs.originalMaterialsRef.current.get(child)
        if (originalMat) {
          const mat = Array.isArray(originalMat) ? originalMat[0] : originalMat
          if (mat && typeof mat.clone === 'function') {
            const restoredMat = mat.clone()
            restoredMat.transparent = false
            restoredMat.opacity = 1.0
            child.material = restoredMat
          } else {
            child.material = originalMat
            const currentMat = Array.isArray(child.material) ? child.material[0] : child.material
            if (currentMat) {
              currentMat.transparent = false
              currentMat.opacity = 1.0
            }
          }
        }
        refs.originalMaterialsRef.current.delete(child)
      } else {
        const currentMat = Array.isArray(child.material) ? child.material[0] : child.material
        if (currentMat && currentMat.transparent === true && currentMat.opacity < 1.0) {
          if (typeof currentMat.clone === 'function') {
            const restoredMat = currentMat.clone()
            restoredMat.transparent = false
            restoredMat.opacity = 1.0
            child.material = restoredMat
          } else {
            currentMat.transparent = false
            currentMat.opacity = 1.0
          }
        }
      }
      
      if (refs.originalVisibilityRef.current.has(child)) {
        child.visible = refs.originalVisibilityRef.current.get(child) ?? true
        refs.originalVisibilityRef.current.delete(child)
      } else {
        child.visible = true
      }
      
      refs.elementStatesRef.current.set(child, 'normal')
      
      if (child.userData?.edgeLine) {
        const edgeLine = child.userData.edgeLine
        if (refs.originalVisibilityRef.current.has(edgeLine)) {
          edgeLine.visible = refs.originalVisibilityRef.current.get(edgeLine) ?? true
          refs.originalVisibilityRef.current.delete(edgeLine)
        } else {
          edgeLine.visible = true
        }
        if (edgeLine.material) {
          edgeLine.material.transparent = false
          edgeLine.material.opacity = 1.0
        }
      }
      
      restoredCount++
    }
  })
  
  console.log(`[handleShowAll] Restored ${restoredCount} meshes to normal`)
  
  refs.elementStatesRef.current.clear()
  refs.originalMaterialsRef.current.clear()
  refs.originalVisibilityRef.current.clear()
}

