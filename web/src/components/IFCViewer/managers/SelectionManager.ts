// web/src/components/IFCViewer/managers/SelectionManager.ts
import * as THREE from 'three'

interface SelectionCallbacks {
  setSelectedElement: (element: { expressID: number; type: string } | null) => void
}

interface SelectionRefs {
  selectedMeshRef: React.MutableRefObject<THREE.Mesh | null>
  selectedMeshesRef: React.MutableRefObject<THREE.Mesh[]>
  selectedProductIdsRef: React.MutableRefObject<number[]>
  elementStatesRef: React.MutableRefObject<Map<THREE.Mesh, 'normal' | 'transparent' | 'hidden'>>
  originalMaterialsRef: React.MutableRefObject<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>
  originalVisibilityRef: React.MutableRefObject<Map<THREE.Mesh, boolean>>
  selectionModeRef: React.MutableRefObject<'parts' | 'assemblies'>
}

/**
 * SelectionManager handles all selection-related logic for the IFC viewer.
 * This includes highlighting, clearing selection, finding assemblies, and managing selection state.
 */
export class SelectionManager {
  private model: THREE.Object3D
  private callbacks: SelectionCallbacks
  private refs: SelectionRefs
  private filename: string

  constructor(
    model: THREE.Object3D,
    callbacks: SelectionCallbacks,
    refs: SelectionRefs,
    filename: string
  ) {
    this.model = model
    this.callbacks = callbacks
    this.refs = refs
    this.filename = filename
  }

  /**
   * Clear all selected meshes and remove highlighting.
   * Preserves transparency/hidden states set by user.
   */
  clearSelection = () => {
    this.refs.selectedMeshesRef.current.forEach(mesh => {
      if (mesh.userData && mesh.userData._originalMaterial) {
        const persistentState = this.refs.elementStatesRef.current.get(mesh)
        
        if (!persistentState || persistentState === 'normal') {
          const storedMat = Array.isArray(mesh.userData._originalMaterial) ? mesh.userData._originalMaterial[0] : mesh.userData._originalMaterial
          if (storedMat && storedMat.transparent === true && storedMat.opacity < 1.0) {
            if (typeof storedMat.clone === 'function') {
              const fixedMat = storedMat.clone()
              fixedMat.transparent = false
              fixedMat.opacity = 1.0
              mesh.material = fixedMat
            } else {
              storedMat.transparent = false
              storedMat.opacity = 1.0
              mesh.material = mesh.userData._originalMaterial
            }
          } else {
            mesh.material = mesh.userData._originalMaterial
          }
          delete mesh.userData._originalMaterial
        } else if (persistentState === 'transparent') {
          if (this.refs.originalMaterialsRef.current.has(mesh)) {
            const originalMat = this.refs.originalMaterialsRef.current.get(mesh)
            if (originalMat) {
              const material = Array.isArray(originalMat) ? originalMat[0] : originalMat
              if (material && typeof material.clone === 'function') {
                const transparentMat = material.clone()
                transparentMat.transparent = true
                transparentMat.opacity = 0.3
                mesh.material = transparentMat
              } else {
                mesh.material = originalMat
                const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
                if (mat) {
                  mat.transparent = true
                  mat.opacity = 0.3
                }
              }
            }
          } else if (mesh.userData._originalMaterial) {
            const storedMat = mesh.userData._originalMaterial
            const material = Array.isArray(storedMat) ? storedMat[0] : storedMat
            if (material && typeof material.clone === 'function') {
              const transparentMat = material.clone()
              transparentMat.transparent = true
              transparentMat.opacity = 0.3
              mesh.material = transparentMat
            } else {
              mesh.material = storedMat
              if (material) {
                material.transparent = true
                material.opacity = 0.3
              }
            }
          }
          this.refs.elementStatesRef.current.set(mesh, 'transparent')
          delete mesh.userData._originalMaterial
        } else if (persistentState === 'hidden') {
          mesh.visible = false
          delete mesh.userData._originalMaterial
        } else {
          delete mesh.userData._originalMaterial
        }
      }
    })
    this.refs.selectedMeshesRef.current = []
    this.refs.selectedMeshRef.current = null
    this.refs.selectedProductIdsRef.current = []
  }

  /**
   * Highlight a mesh with golden color.
   * Preserves transparency if mesh is in transparent state.
   */
  highlightMesh = (mesh: THREE.Mesh): THREE.Mesh | null => {
    if (mesh && mesh.material) {
      const persistentState = this.refs.elementStatesRef.current.get(mesh)
      
      if (mesh.userData && !mesh.userData._originalMaterial) {
        const currentMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        if (currentMat && typeof currentMat.clone === 'function') {
          mesh.userData._originalMaterial = currentMat.clone()
        } else {
          mesh.userData._originalMaterial = mesh.material
        }
      }
      
      let baseMat: THREE.Material
      if (persistentState && this.refs.originalMaterialsRef.current.has(mesh)) {
        baseMat = this.refs.originalMaterialsRef.current.get(mesh) as THREE.Material
        if (Array.isArray(baseMat)) {
          baseMat = baseMat[0]
        }
      } else {
        baseMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      }
      
      if (baseMat && typeof baseMat.clone === 'function') {
        const highlightMat = baseMat.clone()
        
        if (persistentState === 'transparent') {
          highlightMat.transparent = true
          highlightMat.opacity = 0.3
        }
        
        if (highlightMat.type === 'MeshBasicMaterial') {
          (highlightMat as THREE.MeshBasicMaterial).color = new THREE.Color(0xB8860B)
        } else if ((highlightMat as any).isMeshStandardMaterial || (highlightMat as any).isMeshPhysicalMaterial) {
          const stdMat = highlightMat as THREE.MeshStandardMaterial
          stdMat.emissive = new THREE.Color(0xB8860B)
          stdMat.emissiveIntensity = 0.5
        } else {
          if ('emissive' in highlightMat) {
            (highlightMat as any).emissive = new THREE.Color(0xB8860B)
            if ('emissiveIntensity' in highlightMat) {
              (highlightMat as any).emissiveIntensity = 0.5
            }
          }
        }
        
        mesh.material = highlightMat
        return mesh
      }
    }
    return null
  }

  /**
   * Get assembly information from a mesh.
   */
  getAssemblyInfo = (mesh: THREE.Mesh): { mark: string | null; assemblyId: number | null } => {
    let productId: number | null = null
    
    if (mesh.userData?.product_id) {
      productId = mesh.userData.product_id
    } else if (mesh.userData?.expressID) {
      productId = mesh.userData.expressID
    } else if (mesh.userData?.id) {
      productId = mesh.userData.id
    } else if ((mesh as any).metadata?.product_id) {
      productId = (mesh as any).metadata.product_id
    } else if (mesh.name) {
      const parts = mesh.name.split('_')
      if (parts.length >= 2) {
        const parsed = parseInt(parts[1])
        if (!isNaN(parsed)) productId = parsed
      }
    }
    
    if (productId && this.model.userData?.assemblyMapping && this.model.userData.assemblyMapping[productId]) {
      const assemblyInfo = this.model.userData.assemblyMapping[productId]
      const assemblyMark = assemblyInfo.assembly_mark
      const assemblyId = assemblyInfo.assembly_id || null
      
      if (assemblyMark && assemblyMark !== 'N/A') {
        if (!mesh.userData) mesh.userData = {}
        mesh.userData.assembly_mark = assemblyMark
        mesh.userData.assembly_id = assemblyId
        mesh.userData.product_id = productId
        return { mark: assemblyMark, assemblyId: assemblyId }
      }
    }
    
    if (mesh.userData?.assembly_mark) {
      return {
        mark: mesh.userData.assembly_mark,
        assemblyId: mesh.userData.assembly_id || null
      }
    }
    
    if ((mesh as any).metadata?.assembly_mark) {
      return {
        mark: (mesh as any).metadata.assembly_mark,
        assemblyId: (mesh as any).metadata.assembly_id || null
      }
    }
    
    if (mesh.name) {
      const parts = mesh.name.split('_')
      if (parts.length >= 3) {
        return {
          mark: parts.slice(2).join('_'),
          assemblyId: null
        }
      }
    }
    
    return { mark: null, assemblyId: null }
  }

  /**
   * Find all meshes with a specific assembly ID.
   */
  findAllMeshesWithAssemblyId = (assemblyId: number | null): THREE.Mesh[] => {
    const meshes: THREE.Mesh[] = []
    
    if (assemblyId === null) {
      return []
    }
    
    this.model.traverse((child: any) => {
      if (child.isMesh) {
        const childAssemblyId = child.userData?.assembly_id || null
        if (childAssemblyId === assemblyId) {
          meshes.push(child)
        }
      }
    })
    return meshes
  }

  /**
   * Find all meshes in an assembly by product ID and assembly mark.
   */
  findAllMeshesInAssembly = async (productId: number, assemblyMark: string): Promise<THREE.Mesh[]> => {
    try {
      const response = await fetch(`/api/assembly-parts/${this.filename}?product_id=${productId}&assembly_mark=${encodeURIComponent(assemblyMark)}`)
      if (response.ok) {
        const data = await response.json()
        const productIds = data.product_ids || []
        
        const meshes: THREE.Mesh[] = []
        this.model.traverse((child: any) => {
          if (child.isMesh) {
            let childProductId: number | null = null
            if (child.userData?.product_id) {
              childProductId = child.userData.product_id
            } else if (child.userData?.expressID) {
              childProductId = child.userData.expressID
            } else if (child.userData?.id) {
              childProductId = child.userData.id
            } else if ((child as any).metadata?.product_id) {
              childProductId = (child as any).metadata.product_id
            } else if (child.name) {
              const parts = child.name.split('_')
              if (parts.length >= 2) {
                const parsed = parseInt(parts[1])
                if (!isNaN(parsed)) childProductId = parsed
              }
            }
            
            if (childProductId && productIds.includes(childProductId)) {
              meshes.push(child)
            }
          }
        })
        return meshes
      }
    } catch (error) {
      console.warn('[ASSEMBLY] Error fetching assembly parts from API:', error)
    }
    
    const meshes: THREE.Mesh[] = []
    this.model.traverse((child: any) => {
      if (child.isMesh) {
        const childAssemblyMark = child.userData?.assembly_mark
        if (childAssemblyMark && childAssemblyMark === assemblyMark) {
          meshes.push(child)
        }
      }
    })
    return meshes
  }

  /**
   * Handle selection from a mesh.
   */
  handleSelectionFromMesh = async (mesh: THREE.Mesh) => {
    this.clearSelection()

    const currentMode = this.refs.selectionModeRef.current

    if (currentMode === 'parts') {
      const highlighted = this.highlightMesh(mesh)
      if (highlighted) {
        this.refs.selectedMeshesRef.current = [highlighted]
        this.refs.selectedMeshRef.current = highlighted
        
        const productId = mesh.userData?.product_id || 
                        mesh.userData?.expressID || 
                        mesh.userData?.id ||
                        ((mesh as any).metadata?.product_id)
        
        console.log('[SELECTION] Parts mode - storing product ID:', {
          productId,
          meshName: mesh.name,
          userData: {
            product_id: mesh.userData?.product_id,
            expressID: mesh.userData?.expressID,
            id: mesh.userData?.id,
            metadata_product_id: (mesh as any).metadata?.product_id
          }
        })
        
        if (productId) {
          this.refs.selectedProductIdsRef.current = [productId]
          console.log('[SELECTION] Updated selectedProductIdsRef.current to:', JSON.stringify(this.refs.selectedProductIdsRef.current))
          console.log('[SELECTION] Product ID value:', productId)
        } else {
          console.warn('[SELECTION] No product ID found for mesh:', mesh.name)
          this.refs.selectedProductIdsRef.current = []
        }
      }

      let expressID = 0
      if (mesh.userData?.product_id) {
        expressID = mesh.userData.product_id
      } else if (mesh.userData?.expressID) {
        expressID = mesh.userData.expressID
      } else if (mesh.userData?.id) {
        expressID = mesh.userData.id
      } else if ((mesh as any).metadata?.product_id) {
        expressID = (mesh as any).metadata.product_id
      } else if (mesh.name) {
        const parts = mesh.name.split('_')
        if (parts.length >= 2) {
          const parsed = parseInt(parts[1])
          if (!isNaN(parsed)) expressID = parsed
        }
      }
      
      let type = 'Unknown'
      if (mesh.userData?.type) {
        type = mesh.userData.type
      } else if ((mesh as any).metadata?.element_type) {
        type = (mesh as any).metadata.element_type
      } else if (mesh.name) {
        const parts = mesh.name.split('_')
        if (parts.length >= 1 && parts[0]) {
          type = parts[0]
        }
      }

      this.callbacks.setSelectedElement({ expressID, type })
      console.log('[SELECTION] Selected part:', { 
        expressID, 
        type,
        storedProductIds: JSON.stringify(this.refs.selectedProductIdsRef.current),
        storedProductIdsArray: [...this.refs.selectedProductIdsRef.current],
        storedMeshes: this.refs.selectedMeshesRef.current.map(m => ({
          name: m.name,
          productId: m.userData?.product_id || m.userData?.expressID || m.userData?.id
        }))
      })
    } else {
      // Assemblies mode
      const assemblyInfo = this.getAssemblyInfo(mesh)
      const assemblyMark = assemblyInfo.mark
      const assemblyId = assemblyInfo.assemblyId
      
      console.log('Assembly mode - clicked mesh:', {
        assemblyMark,
        assemblyId,
        productId: mesh.userData?.product_id,
        name: mesh.name,
        userData: mesh.userData
      })
      
      if (assemblyId !== null && assemblyId !== undefined) {
        const assemblyMeshes = this.findAllMeshesWithAssemblyId(assemblyId)
        
        console.log(`Found ${assemblyMeshes.length} meshes with assembly ID ${assemblyId} (mark: "${assemblyMark}")`)
        
        const highlightedMeshes: THREE.Mesh[] = []
        assemblyMeshes.forEach(m => {
          const highlighted = this.highlightMesh(m)
          if (highlighted) {
            highlightedMeshes.push(highlighted)
          }
        })
        
        this.refs.selectedMeshesRef.current = highlightedMeshes
        if (highlightedMeshes.length > 0) {
          this.refs.selectedMeshRef.current = highlightedMeshes[0]
          
          const productIds: number[] = []
          highlightedMeshes.forEach(m => {
            const productId = m.userData?.product_id || 
                            m.userData?.expressID || 
                            m.userData?.id ||
                            ((m as any).metadata?.product_id)
            if (productId) {
              productIds.push(productId)
            }
          })
          this.refs.selectedProductIdsRef.current = productIds
          console.log('[SELECTION] Assembly mode - stored product IDs:', {
            productIds,
            assemblyId,
            assemblyMark,
            meshCount: highlightedMeshes.length
          })
        }

        let expressID = 0
        if (mesh.userData?.product_id) {
          expressID = mesh.userData.product_id
        } else if (mesh.userData?.expressID) {
          expressID = mesh.userData.expressID
        } else if (mesh.userData?.id) {
          expressID = mesh.userData.id
        } else if ((mesh as any).metadata?.product_id) {
          expressID = (mesh as any).metadata.product_id
        } else if (mesh.name) {
          const parts = mesh.name.split('_')
          if (parts.length >= 2) {
            const parsed = parseInt(parts[1])
            if (!isNaN(parsed)) expressID = parsed
          }
        }
        const type = `Assembly: ${assemblyMark || 'Unknown'}`

        this.callbacks.setSelectedElement({ expressID, type })
        console.log(`Selected assembly instance (ID: ${assemblyId}, mark: "${assemblyMark}"): ${assemblyMeshes.length} parts`)
      } else if (assemblyMark && assemblyMark !== 'N/A' && assemblyMark !== 'null') {
        console.log('No assembly_id found, trying to find assembly parts via API for product:', mesh.userData?.product_id, 'assembly_mark:', assemblyMark)
        
        const clickedProductId = mesh.userData?.product_id || 
                                mesh.userData?.expressID || 
                                mesh.userData?.id ||
                                ((mesh as any).metadata?.product_id)
        
        if (clickedProductId && this.filename) {
          try {
            const response = await fetch(`/api/assembly-parts/${encodeURIComponent(this.filename)}?product_id=${clickedProductId}&assembly_mark=${encodeURIComponent(assemblyMark)}`)
            if (response.ok) {
              const data = await response.json()
              const productIdsInAssembly = data.product_ids || []
              console.log(`API returned ${productIdsInAssembly.length} product IDs in assembly:`, productIdsInAssembly)
              
              const assemblyMeshes: THREE.Mesh[] = []
              this.model.traverse((child: any) => {
                if (child.isMesh) {
                  let childProductId: number | null = null
                  if (child.userData?.product_id) {
                    childProductId = child.userData.product_id
                  } else if (child.userData?.expressID) {
                    childProductId = child.userData.expressID
                  } else if (child.userData?.id) {
                    childProductId = child.userData.id
                  } else if ((child as any).metadata?.product_id) {
                    childProductId = (child as any).metadata.product_id
                  } else if (child.name) {
                    const parts = child.name.split('_')
                    if (parts.length >= 2) {
                      const parsed = parseInt(parts[1])
                      if (!isNaN(parsed)) childProductId = parsed
                    }
                  }
                  
                  if (childProductId && productIdsInAssembly.includes(childProductId)) {
                    assemblyMeshes.push(child)
                  }
                }
              })
              
              console.log(`Found ${assemblyMeshes.length} meshes from API result`)
              
              if (assemblyMeshes.length > 0) {
                const highlightedMeshes: THREE.Mesh[] = []
                assemblyMeshes.forEach(m => {
                  const highlighted = this.highlightMesh(m)
                  if (highlighted) {
                    highlightedMeshes.push(highlighted)
                  }
                })
                
                this.refs.selectedMeshesRef.current = highlightedMeshes
                if (highlightedMeshes.length > 0) {
                  this.refs.selectedMeshRef.current = highlightedMeshes[0]
                  
                  const productIds: number[] = []
                  highlightedMeshes.forEach(m => {
                    const productId = m.userData?.product_id || 
                                    m.userData?.expressID || 
                                    m.userData?.id ||
                                    ((m as any).metadata?.product_id)
                    if (productId) {
                      productIds.push(productId)
                    }
                  })
                  this.refs.selectedProductIdsRef.current = productIds
                }
                
                let expressID = clickedProductId
                const type = `Assembly: ${assemblyMark || 'Unknown'}`
                this.callbacks.setSelectedElement({ expressID, type })
                console.log(`Selected assembly (via API): ${assemblyMeshes.length} parts`)
                return
              }
            }
          } catch (error) {
            console.warn('[ASSEMBLY] Error fetching assembly parts from API:', error)
          }
        }
        
        console.log('Falling back to assembly_mark matching from mapping')
        const productIdsInAssembly: number[] = []
        if (this.model.userData?.assemblyMapping) {
          for (const [productIdStr, mappingEntry] of Object.entries(this.model.userData.assemblyMapping)) {
            const productId = parseInt(productIdStr)
            const entry = mappingEntry as { assembly_mark?: string; assembly_id?: number }
            if (!isNaN(productId) && entry.assembly_mark === assemblyMark) {
              productIdsInAssembly.push(productId)
            }
          }
        }
        
        console.log(`Found ${productIdsInAssembly.length} product IDs with assembly mark "${assemblyMark}":`, productIdsInAssembly)
        
        const assemblyMeshes: THREE.Mesh[] = []
        this.model.traverse((child: any) => {
          if (child.isMesh) {
            let childProductId: number | null = null
            if (child.userData?.product_id) {
              childProductId = child.userData.product_id
            } else if (child.userData?.expressID) {
              childProductId = child.userData.expressID
            } else if (child.userData?.id) {
              childProductId = child.userData.id
            } else if ((child as any).metadata?.product_id) {
              childProductId = (child as any).metadata.product_id
            } else if (child.name) {
              const parts = child.name.split('_')
              if (parts.length >= 2) {
                const parsed = parseInt(parts[1])
                if (!isNaN(parsed)) childProductId = parsed
              }
            }
            
            if (childProductId && productIdsInAssembly.includes(childProductId)) {
              assemblyMeshes.push(child)
            } else {
              const childAssemblyMark = child.userData?.assembly_mark
              if (childAssemblyMark && childAssemblyMark === assemblyMark) {
                assemblyMeshes.push(child)
              }
            }
          }
        })
        
        console.log(`Found ${assemblyMeshes.length} meshes with assembly mark "${assemblyMark}"`)
        
        const highlightedMeshes: THREE.Mesh[] = []
        assemblyMeshes.forEach(m => {
          const highlighted = this.highlightMesh(m)
          if (highlighted) {
            highlightedMeshes.push(highlighted)
          }
        })
        
        this.refs.selectedMeshesRef.current = highlightedMeshes
        if (highlightedMeshes.length > 0) {
          this.refs.selectedMeshRef.current = highlightedMeshes[0]
          
          const productIds: number[] = []
          highlightedMeshes.forEach(m => {
            const productId = m.userData?.product_id || 
                            m.userData?.expressID || 
                            m.userData?.id ||
                            ((m as any).metadata?.product_id)
            if (productId) {
              productIds.push(productId)
            }
          })
          this.refs.selectedProductIdsRef.current = productIds
        }

        let expressID = 0
        if (mesh.userData?.product_id) {
          expressID = mesh.userData.product_id
        } else if (mesh.userData?.expressID) {
          expressID = mesh.userData.expressID
        } else if (mesh.userData?.id) {
          expressID = mesh.userData.id
        } else if ((mesh as any).metadata?.product_id) {
          expressID = (mesh as any).metadata.product_id
        } else if (mesh.name) {
          const parts = mesh.name.split('_')
          if (parts.length >= 2) {
            const parsed = parseInt(parts[1])
            if (!isNaN(parsed)) expressID = parsed
          }
        }
        
        let type = 'Unknown'
        if (mesh.userData?.type) {
          type = mesh.userData.type
        } else if ((mesh as any).metadata?.element_type) {
          type = (mesh as any).metadata.element_type
        } else if (mesh.name) {
          const parts = mesh.name.split('_')
          if (parts.length >= 1 && parts[0]) {
            type = parts[0]
          }
        }

        this.callbacks.setSelectedElement({ expressID, type })
        console.log('Selected part (no assembly_id):', { expressID, type })
      } else {
        const highlighted = this.highlightMesh(mesh)
        if (highlighted) {
          this.refs.selectedMeshesRef.current = [highlighted]
          this.refs.selectedMeshRef.current = highlighted
        }

        let expressID = 0
        if (mesh.userData?.product_id) {
          expressID = mesh.userData.product_id
        } else if (mesh.userData?.expressID) {
          expressID = mesh.userData.expressID
        } else if (mesh.userData?.id) {
          expressID = mesh.userData.id
        } else if ((mesh as any).metadata?.product_id) {
          expressID = (mesh as any).metadata.product_id
        } else if (mesh.name) {
          const parts = mesh.name.split('_')
          if (parts.length >= 2) {
            const parsed = parseInt(parts[1])
            if (!isNaN(parsed)) expressID = parsed
          }
        }
        
        let type = 'Unknown'
        if (mesh.userData?.type) {
          type = mesh.userData.type
        } else if ((mesh as any).metadata?.element_type) {
          type = (mesh as any).metadata.element_type
        } else if (mesh.name) {
          const parts = mesh.name.split('_')
          if (parts.length >= 1 && parts[0]) {
            type = parts[0]
          }
        }

        this.callbacks.setSelectedElement({ expressID, type })
        console.log('Selected part (no assembly mark):', { expressID, type })
      }
    }
  }
}

/**
 * Setup click selection for the IFC viewer.
 * Returns cleanup function.
 */
export const setupClickSelection = (
  model: THREE.Object3D,
  setSelectedElement: (element: { expressID: number; type: string } | null) => void,
  refs: SelectionRefs,
  filename: string,
  handleSelectionFromMeshRef: React.MutableRefObject<((mesh: THREE.Mesh) => Promise<void>) | null>,
  clearSelectionRef: React.MutableRefObject<(() => void) | null>
): (() => void) => {
  const manager = new SelectionManager(model, { setSelectedElement }, refs, filename)
  
  handleSelectionFromMeshRef.current = manager.handleSelectionFromMesh
  clearSelectionRef.current = manager.clearSelection

  return () => {
    manager.clearSelection()
    handleSelectionFromMeshRef.current = null
    clearSelectionRef.current = null
  }
}

