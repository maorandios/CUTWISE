// web/src/components/IFCViewer/utils/filterUtils.ts
import * as THREE from 'three'

export interface FilterSet {
  profileTypes: Set<string>
  plateThicknesses: Set<string>
  assemblyMarks: Set<string>
}

interface FilterRefs {
  originalMaterialsRef: React.MutableRefObject<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>
}

/**
 * Get element type from multiple possible sources in mesh userData.
 */
const getElementType = (mesh: THREE.Mesh, model: THREE.Group | null): string => {
  let elementType = mesh.userData?.type || mesh.userData?.element_type || ''
  
  // Try to get from material name (some materials have element type in name)
  if (!elementType) {
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (material?.name) {
      const matName = material.name.toString()
      // Check if material name contains IFC element type (e.g., "IfcBeam", "IfcColumn")
      const ifcTypeMatch = matName.match(/Ifc[A-Z][a-zA-Z]+/)
      if (ifcTypeMatch) {
        elementType = ifcTypeMatch[0]
        // Store it in userData for future use
        if (!mesh.userData) mesh.userData = {}
        mesh.userData.type = elementType
      }
    }
  }
  
  // Try to parse from mesh name if available
  if (!elementType && mesh.name) {
    const parts = mesh.name.split('_')
    if (parts.length > 0 && parts[0].startsWith('Ifc')) {
      elementType = parts[0]
      // Store it in userData for future use
      if (!mesh.userData) mesh.userData = {}
      mesh.userData.type = elementType
    }
  }
  
  // Last resort: try to get from assembly mapping if available
  if (!elementType && model?.userData?.assemblyMapping) {
    const mapping = model.userData.assemblyMapping
    let productId: number | null = null
    
    if (mesh.userData?.product_id) {
      productId = mesh.userData.product_id
    } else if (mesh.userData?.expressID) {
      productId = mesh.userData.expressID
    } else if ((mesh as any).metadata?.product_id) {
      productId = (mesh as any).metadata.product_id
    }
    
    if (productId && mapping[productId]) {
      elementType = mapping[productId].element_type
      if (!mesh.userData) mesh.userData = {}
      mesh.userData.type = elementType
      mesh.userData.assembly_mark = mapping[productId].assembly_mark
      mesh.userData.product_id = productId
      // Store plate thickness if available (even if it's "N/A")
      if (mapping[productId].plate_thickness !== undefined && mapping[productId].plate_thickness !== null) {
        mesh.userData.plate_thickness = mapping[productId].plate_thickness
      }
      // Store profile_name if available (for beams, columns, members)
      const elementTypeFromMapping = mapping[productId].element_type
      if (elementTypeFromMapping === 'IfcBeam' || elementTypeFromMapping === 'IfcColumn' || elementTypeFromMapping === 'IfcMember') {
        if (mapping[productId].profile_name !== undefined && mapping[productId].profile_name !== null) {
          mesh.userData.profile_name = mapping[productId].profile_name
        } else {
          // Default to "N/A" if missing
          mesh.userData.profile_name = "N/A"
        }
      }
    }
  }
  
  return elementType
}

/**
 * Check if mesh matches profile type filter.
 */
const matchesProfileTypeFilter = (
  mesh: THREE.Mesh,
  elementType: string,
  filters: FilterSet
): boolean => {
  if (filters.profileTypes.size === 0) return true
  
  const isProfileElement = elementType === 'IfcBeam' || elementType === 'IfcColumn' || elementType === 'IfcMember'
  
  if (isProfileElement) {
    // For profile elements, check if profile_name matches
    const profileName = (mesh.userData?.profile_name || '').trim()
    
    // Always log profile filtering for debugging
    console.log(`[FILTER] Profile element check: productId=${mesh.userData?.product_id || 'unknown'}, elementType=${elementType}, profile_name="${profileName}", userData keys=[${Object.keys(mesh.userData || {}).join(',')}], filter=[${Array.from(filters.profileTypes).join(',')}]`)
    
    if (profileName && profileName !== 'N/A') {
      // Check if profile_name matches any filter value (case-insensitive, trimmed)
      for (const filterProfile of filters.profileTypes) {
        const normalizedFilter = filterProfile.trim()
        const normalizedProfile = profileName.trim()
        
        // Try exact match first
        if (normalizedFilter === normalizedProfile) {
          console.log(`[FILTER] Profile element ${mesh.userData?.product_id || 'unknown'}: profile_name="${profileName}", filter=[${Array.from(filters.profileTypes).join(',')}], matches=true`)
          return true
        }
        
        // Try case-insensitive match
        if (normalizedFilter.toLowerCase() === normalizedProfile.toLowerCase()) {
          console.log(`[FILTER] Profile element ${mesh.userData?.product_id || 'unknown'}: profile_name="${profileName}", filter=[${Array.from(filters.profileTypes).join(',')}], matches=true`)
          return true
        }
      }
      
      console.log(`[FILTER] Profile element ${mesh.userData?.product_id || 'unknown'}: profile_name="${profileName}", filter=[${Array.from(filters.profileTypes).join(',')}], matches=false`)
      return false
    } else {
      // If profile_name is not set or is "N/A", it doesn't match any filter
      console.log(`[FILTER] Profile element ${mesh.userData?.product_id || 'unknown'}: profile_name missing or N/A (value="${profileName}"), elementType=${elementType}, userData keys=${Object.keys(mesh.userData || {}).join(',')}`)
      return false
    }
  } else {
    // For non-profile elements (plates, fasteners, etc.), they should be greyed out when profile filter is active
    return false
  }
}

/**
 * Check if mesh matches assembly mark filter.
 */
const matchesAssemblyFilter = (
  mesh: THREE.Mesh,
  filters: FilterSet,
  debugCount: number
): boolean => {
  if (filters.assemblyMarks.size === 0) return true
  
  const assemblyMark = mesh.userData?.assembly_mark || ''
  const normalizedMark = (assemblyMark || '').trim()
  
  if (normalizedMark && normalizedMark !== 'N/A' && normalizedMark !== 'null') {
    for (const filterMark of filters.assemblyMarks) {
      const normalizedFilter = (filterMark || '').trim()
      // Try exact match first
      if (normalizedFilter === normalizedMark) {
        return true
      }
      // Try case-insensitive match
      if (normalizedFilter.toLowerCase() === normalizedMark.toLowerCase()) {
        return true
      }
    }
  }
  
  // Debug logging for first few assembly filter checks
  if (debugCount < 10) {
    console.log(`[FILTER] Assembly check: mark="${assemblyMark || 'EMPTY'}" (normalized="${normalizedMark}"), filter=[${Array.from(filters.assemblyMarks).join(',')}], matches=false, productId=${mesh.userData?.product_id || 'unknown'}`)
  }
  
  return false
}

/**
 * Check if mesh matches plate thickness filter.
 */
const matchesPlateThicknessFilter = (
  mesh: THREE.Mesh,
  elementType: string,
  filters: FilterSet
): boolean => {
  if (filters.plateThicknesses.size === 0) return true
  
  const isPlate = elementType === 'IfcPlate'
  
  if (isPlate) {
    // Get plate thickness from userData (set from assembly mapping)
    let plateThickness = (mesh.userData?.plate_thickness || '').toString().trim()
    
    // Always log plate filtering for debugging
    console.log(`[FILTER] Plate check: productId=${mesh.userData?.product_id || 'unknown'}, elementType=${elementType}, plate_thickness="${plateThickness}", userData keys=[${Object.keys(mesh.userData || {}).join(',')}], filter=[${Array.from(filters.plateThicknesses).join(',')}]`)
    
    if (plateThickness && plateThickness !== 'N/A' && plateThickness !== 'null' && plateThickness !== '') {
      // Try to match: check if plateThickness matches any filter value
      for (const filterThickness of filters.plateThicknesses) {
        const filterThicknessStr = (filterThickness || '').toString().trim()
        
        // Normalize both values for comparison - remove "PL" prefix and "mm" suffix, trim whitespace
        const normalizedFilter = filterThicknessStr.replace(/^PL/i, '').replace(/mm$/i, '').trim()
        const normalizedPlate = plateThickness.replace(/^PL/i, '').replace(/mm$/i, '').trim()
        
        // Check if normalized numeric values match (e.g., "12" === "12")
        if (normalizedFilter === normalizedPlate && normalizedFilter !== '') {
          console.log(`[FILTER] Plate ${mesh.userData?.product_id || 'unknown'}: thickness='${plateThickness}', filter=[${Array.from(filters.plateThicknesses).join(',')}], matches=true`)
          return true
        }
        
        // Also check exact match (for cases like "PL10" vs "PL10")
        if (filterThicknessStr === plateThickness) {
          console.log(`[FILTER] Plate ${mesh.userData?.product_id || 'unknown'}: thickness='${plateThickness}', filter=[${Array.from(filters.plateThicknesses).join(',')}], matches=true`)
          return true
        }
        
        // Check if one contains the other (for cases like "12mm" contains "12")
        if (normalizedFilter !== '' && normalizedPlate !== '' && 
            (plateThickness.includes(normalizedFilter) || filterThicknessStr.includes(normalizedPlate))) {
          console.log(`[FILTER] Plate ${mesh.userData?.product_id || 'unknown'}: thickness='${plateThickness}', filter=[${Array.from(filters.plateThicknesses).join(',')}], matches=true`)
          return true
        }
      }
      
      // No match found
      console.log(`[FILTER] Plate ${mesh.userData?.product_id || 'unknown'}: thickness='${plateThickness}', filter=[${Array.from(filters.plateThicknesses).join(',')}], matches=false`)
      return false
    } else {
      // No thickness info available or "N/A" - this plate doesn't match any filter
      console.log(`[FILTER] Plate ${mesh.userData?.product_id || 'unknown'}: thickness missing or N/A (value="${plateThickness}"), userData keys=[${Object.keys(mesh.userData || {}).join(',')}]`)
      return false
    }
  } else {
    // Not a plate - when plate thickness filter is active, non-plates should be greyed out
    return false
  }
}

/**
 * Restore mesh to original material (remove filter grey).
 */
const restoreMeshMaterial = (
  mesh: THREE.Mesh,
  refs: FilterRefs
): void => {
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
  } else {
    // If we don't have original stored, ensure current material is not transparent
    const currentMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (currentMat && currentMat !== mesh.userData._filterGreyMaterial) {
      currentMat.transparent = false
      currentMat.opacity = 1.0
    }
  }
}

/**
 * Apply grey material to mesh (filter non-match).
 */
const applyGreyMaterial = (
  mesh: THREE.Mesh,
  refs: FilterRefs
): void => {
  // Store original material if not already stored
  if (!refs.originalMaterialsRef.current.has(mesh)) {
    const currentMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (currentMat && currentMat !== mesh.userData._filterGreyMaterial) {
      refs.originalMaterialsRef.current.set(mesh, currentMat.clone ? currentMat.clone() : currentMat)
    }
  }
  
  // Create or reuse dark grey material with good visibility
  if (!mesh.userData._filterGreyMaterial) {
    const greyMat = new THREE.MeshStandardMaterial({
      color: 0x333333, // Dark grey color
      metalness: 0.1,
      roughness: 0.8,
      transparent: true,
      opacity: 0.65 // Higher opacity (65%) so geometry remains clearly visible
    })
    mesh.userData._filterGreyMaterial = greyMat
  }
  mesh.material = mesh.userData._filterGreyMaterial
}

/**
 * Apply filters to model meshes.
 * Restores original materials for matching meshes, applies grey for non-matching.
 */
export const applyFiltersToModel = (
  model: THREE.Group | null,
  filters: FilterSet | null | undefined,
  refs: FilterRefs
): void => {
  if (!model || !filters) return

  const hasActiveFilters = 
    filters.profileTypes.size > 0 || 
    filters.plateThicknesses.size > 0 || 
    filters.assemblyMarks.size > 0

  if (!hasActiveFilters) {
    // No filters active - restore all meshes to original colors
    model.traverse((child: any) => {
      if (child.isMesh) {
        // Only restore if we have a stored original material
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
          // Clear the stored original since we've restored it
          refs.originalMaterialsRef.current.delete(child)
        } else {
          // If no original stored, just ensure current material is not transparent
          const currentMat = Array.isArray(child.material) ? child.material[0] : child.material
          if (currentMat && currentMat !== child.userData._filterGreyMaterial) {
            currentMat.transparent = false
            currentMat.opacity = 1.0
          }
        }
        // Remove filter grey material reference if it exists
        if (child.userData._filterGreyMaterial) {
          delete child.userData._filterGreyMaterial
        }
      }
    })
    return
  }

  // Filters are active - apply grey to non-matching meshes
  let debugCount = 0
  const debugTypes = new Set<string>()
  const debugMatches = { matched: 0, greyed: 0, noType: 0 }
  const sampleChecks: Array<{ type: string; matches: boolean; reason: string }> = []
  
  model.traverse((child: any) => {
    if (child.isMesh) {
      const elementType = getElementType(child, model)
      
      // Debug: collect element types
      if (elementType) {
        debugTypes.add(elementType)
      } else {
        debugMatches.noType++
      }
      debugCount++
      
      // Debug: Log element type and userData when filters are active
      if ((filters.profileTypes.size > 0 || filters.plateThicknesses.size > 0) && debugCount <= 20) {
        console.log(`[FILTER] Element ${debugCount}: productId=${child.userData?.product_id || 'unknown'}, elementType="${elementType || 'MISSING'}", userData.type="${child.userData?.type || 'missing'}", profile_name="${child.userData?.profile_name || 'missing'}", plate_thickness="${child.userData?.plate_thickness || 'missing'}", userData keys=[${Object.keys(child.userData || {}).join(',')}]`)
      }
      
      const assemblyMark = child.userData?.assembly_mark || ''
      
      // Check all filter criteria
      const matchesProfileType = matchesProfileTypeFilter(child, elementType, filters)
      const matchesAssembly = matchesAssemblyFilter(child, filters, debugCount)
      const matchesPlateThickness = matchesPlateThicknessFilter(child, elementType, filters)
      
      // Element matches filter if ALL active filter categories match
      const matchesFilter = matchesProfileType && matchesAssembly && matchesPlateThickness
      
      // Debug: Log first few plate filtering decisions
      const isPlate = elementType === 'IfcPlate'
      if (isPlate && filters.plateThicknesses.size > 0 && debugCount < 5) {
        console.log(`[FILTER] Plate ${child.userData?.product_id || 'unknown'}: thickness='${child.userData?.plate_thickness || 'N/A'}', filter=[${Array.from(filters.plateThicknesses).join(',')}], matches=${matchesPlateThickness}, finalMatch=${matchesFilter}`)
      }
      
      // Debug tracking
      if (matchesFilter) {
        debugMatches.matched++
      } else {
        debugMatches.greyed++
      }
      
      // Sample debug info (first 5 non-matching elements)
      if (sampleChecks.length < 5 && !matchesFilter && elementType) {
        const reasons: string[] = []
        if (!matchesProfileType && filters.profileTypes.size > 0) {
          const filterTypes = Array.from(filters.profileTypes)
          reasons.push(`profileType:"${elementType}" (len:${elementType.length}) not in [${filterTypes.map(t => `"${t}"(len:${t.length})`).join(',')}]`)
        }
        if (!matchesAssembly && filters.assemblyMarks.size > 0) reasons.push(`assembly:${assemblyMark} not in [${Array.from(filters.assemblyMarks).join(',')}]`)
        if (!matchesPlateThickness && filters.plateThicknesses.size > 0 && isPlate) reasons.push(`plateThickness:${child.userData?.plate_thickness || 'N/A'} not in [${Array.from(filters.plateThicknesses).join(',')}]`)
        sampleChecks.push({ type: elementType, matches: matchesFilter, reason: reasons.join('; ') || 'unknown' })
      }
      
      if (matchesFilter) {
        // Mesh matches filter - restore original color
        // Store original material if not already stored
        if (!refs.originalMaterialsRef.current.has(child)) {
          const currentMat = Array.isArray(child.material) ? child.material[0] : child.material
          if (currentMat) {
            // Only store if it's not already the grey filter material
            if (!child.userData._filterGreyMaterial || currentMat !== child.userData._filterGreyMaterial) {
              refs.originalMaterialsRef.current.set(child, currentMat.clone ? currentMat.clone() : currentMat)
            }
          }
        }
        
        restoreMeshMaterial(child, refs)
      } else {
        // Mesh doesn't match filter - apply dark grey color
        applyGreyMaterial(child, refs)
      }
    }
  })
  
  // Debug logging (only log once per filter change)
  console.log('[FILTER] ===== Filter Application Debug =====')
  console.log('[FILTER] Element types found in model:', Array.from(debugTypes).sort())
  const profileTypesArray = Array.from(filters.profileTypes)
  const plateThicknessesArray = Array.from(filters.plateThicknesses)
  const assemblyMarksArray = Array.from(filters.assemblyMarks)
  console.log('[FILTER] Active filters:', {
    profileTypes: profileTypesArray,
    plateThicknesses: plateThicknessesArray,
    assemblyMarks: assemblyMarksArray
  })
  console.log('[FILTER] Filter value details:', {
    profileTypesValues: profileTypesArray.map(v => `"${v}" (length: ${v.length})`),
    plateThicknessesValues: plateThicknessesArray.map(v => `"${v}" (length: ${v.length})`),
    assemblyMarksValues: assemblyMarksArray.map(v => `"${v}" (length: ${v.length})`)
  })
  console.log('[FILTER] Results:', {
    matched: debugMatches.matched,
    greyed: debugMatches.greyed,
    noType: debugMatches.noType
  })
  if (sampleChecks.length > 0) {
    console.log('[FILTER] Sample non-matching elements:', sampleChecks)
    console.log('[FILTER] First non-matching element details:', sampleChecks[0])
  }
  console.log('[FILTER] ====================================')
}

