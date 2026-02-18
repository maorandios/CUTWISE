import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadGLTFOptions {
  filename: string;
  gltfPath?: string;
  gltfAvailable?: boolean;
  onConversionStatus?: (status: string) => void;
}

export interface LoadGLTFResult {
  scene: THREE.Group;
  edgeLines: THREE.LineSegments[];
  meshesToProcessForEdges: any[];
}

/**
 * Checks if a GLTF file exists at the given path.
 */
export const checkGLTFExists = async (gltfFilename: string): Promise<boolean> => {
  try {
    const headResponse = await fetch(gltfFilename, { method: 'HEAD' });
    return headResponse.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Triggers IFC to GLTF conversion on the backend.
 */
export const convertIFCToGLTF = async (filename: string): Promise<{ gltf_path?: string }> => {
  const convertResponse = await fetch(`/api/convert-gltf/${filename}`, {
    method: 'POST'
  });
  
  if (!convertResponse.ok) {
    const errorData = await convertResponse.json().catch(() => ({ detail: 'Conversion failed' }));
    console.error('IFCViewer: Conversion request failed:', errorData);
    throw new Error(errorData.detail || 'Failed to start glTF conversion');
  }
  
  return await convertResponse.json();
};

/**
 * Polls for GLTF file availability after conversion.
 */
export const pollForGLTFFile = async (
  gltfFilename: string,
  maxAttempts: number = 60,
  onProgress?: (attempt: number) => void
): Promise<boolean> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const checkResponse = await fetch(gltfFilename, { method: 'HEAD' });
    if (checkResponse.ok) {
      return true;
    }
    attempts++;
    if (onProgress) {
      onProgress(attempts);
    }
  }
  
  return false;
};

/**
 * Loads a GLTF file and returns the scene.
 */
export const loadGLTFFile = async (gltfFilename: string): Promise<THREE.Group> => {
  console.log('[IFCViewer] About to load glTF file:', gltfFilename);
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(gltfFilename);
  console.log('[IFCViewer] glTF loaded successfully, scene:', gltf.scene);
  console.log('[IFCViewer] Scene has', gltf.scene.children.length, 'children');
  return gltf.scene;
};

/**
 * Checks if a mesh is a fastener based on material and node names.
 */
export const isFastenerMesh = (mesh: THREE.Mesh): boolean => {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const matName = (material?.name || '').toString().toLowerCase();
  const nodeName = (mesh.name || '').toLowerCase();
  
  return (
    matName.includes('ifcfastener') ||
    matName.includes('ifcmechanicalfastener') ||
    matName.includes('fastener_detected') ||
    nodeName.includes('ifcfastener') ||
    nodeName.includes('ifcmechanicalfastener') ||
    (nodeName.includes('bolt') || nodeName.includes('nut') || nodeName.includes('washer') || 
     nodeName.includes('fastener') || nodeName.includes('screw') || nodeName.includes('anchor'))
  );
};

/**
 * Removes vertex colors from a mesh geometry and returns a new clean geometry.
 */
export const removeVertexColors = (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
  if (geometry.hasAttribute('color')) {
    geometry.deleteAttribute('color');
  }
  
  const newGeom = new THREE.BufferGeometry();
  
  if (geometry.hasAttribute('position')) {
    newGeom.setAttribute('position', geometry.getAttribute('position').clone());
  }
  if (geometry.hasAttribute('normal')) {
    newGeom.setAttribute('normal', geometry.getAttribute('normal').clone());
  }
  if (geometry.hasAttribute('uv')) {
    newGeom.setAttribute('uv', geometry.getAttribute('uv').clone());
  }
  if (geometry.hasAttribute('uv2')) {
    newGeom.setAttribute('uv2', geometry.getAttribute('uv2').clone());
  }
  if (geometry.index) {
    newGeom.setIndex(geometry.index.clone());
  }
  
  return newGeom;
};

/**
 * Creates a dark brown-gold material for fasteners.
 */
export const createFastenerMaterial = (): THREE.MeshStandardMaterial => {
  const darkBrownGoldColor = new THREE.Color(0x8B6914);
  return new THREE.MeshStandardMaterial({
    color: darkBrownGoldColor,
    metalness: 0.3,
    roughness: 0.6,
    vertexColors: false
  });
};

/**
 * Creates edge lines for a mesh with a given color.
 */
export const createEdgeLines = (
  geometry: THREE.BufferGeometry,
  color: THREE.Color,
  meshName: string
): THREE.LineSegments => {
  const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
  const black = new THREE.Color(0x000000);
  const darkerColor = color.clone().lerp(black, 0.8);
  
  const edgesMaterial = new THREE.LineBasicMaterial({ 
    color: darkerColor,
    linewidth: 1.5,
    opacity: 0.8,
    transparent: true
  });
  
  const edgeLine = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  edgeLine.name = `${meshName || 'mesh'}_edges`;
  edgeLine.castShadow = false;
  edgeLine.receiveShadow = false;
  edgeLine.visible = true;
  
  return edgeLine;
};

/**
 * Processes a fastener mesh: removes vertex colors, applies material, and creates edge lines.
 */
export const processFastenerMesh = (mesh: THREE.Mesh, edgeLines: THREE.LineSegments[]): void => {
  // Remove vertex colors and create new geometry
  const newGeom = removeVertexColors(mesh.geometry);
  const originalGeom = mesh.geometry;
  mesh.geometry = newGeom;
  originalGeom.dispose();
  
  // Dispose old material
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m: any) => {
      if (m && typeof m.dispose === 'function') {
        try { m.dispose(); } catch (e) {}
      }
    });
  } else if (mesh.material && typeof mesh.material.dispose === 'function') {
    try { mesh.material.dispose(); } catch (e) {}
  }
  
  // Apply fastener material
  mesh.material = createFastenerMaterial();
  
  // Add edge lines
  try {
    const darkBrownGoldColor = new THREE.Color(0x8B6914);
    const edgeLine = createEdgeLines(newGeom, darkBrownGoldColor, mesh.name);
    
    if (!mesh.userData) mesh.userData = {};
    mesh.userData.edgeLine = edgeLine;
    edgeLines.push(edgeLine);
    
    mesh.add(edgeLine);
  } catch (e) {
    // Ignore edge creation errors
  }
};

/**
 * Extracts assembly mark and metadata from mesh name and metadata.
 */
export const extractMeshMetadata = (mesh: THREE.Mesh): void => {
  if (!mesh.userData) mesh.userData = {};
  
  // Try to get assembly mark from various sources
  if (mesh.userData.assembly_mark) {
    // Already stored
  } else if ((mesh as any).metadata?.assembly_mark) {
    mesh.userData.assembly_mark = (mesh as any).metadata.assembly_mark;
    mesh.userData.product_id = (mesh as any).metadata.product_id;
    mesh.userData.type = (mesh as any).metadata.element_type;
  } else if (mesh.name) {
    // Try to parse from name (format: "elementType_productID_assemblyMark")
    const parts = mesh.name.split('_');
    if (parts.length >= 3) {
      mesh.userData.assembly_mark = parts.slice(2).join('_');
      mesh.userData.product_id = parseInt(parts[1]) || 0;
      mesh.userData.type = parts[0];
    }
  }
  
  // Also try to get from glTF extras if available
  if (!mesh.userData.assembly_mark && (mesh as any).userData?.extras) {
    const extras = (mesh as any).userData.extras;
    if (extras.assembly_mark) {
      mesh.userData.assembly_mark = extras.assembly_mark;
    }
    if (extras.product_id) {
      mesh.userData.product_id = extras.product_id;
    }
    if (extras.element_type) {
      mesh.userData.type = extras.element_type;
    }
  }
};

/**
 * Processes all meshes in the scene: materials, metadata, and edge lines.
 */
export const processMeshes = (
  scene: THREE.Group,
  edgeLines: THREE.LineSegments[],
  meshesToProcessForEdges: any[]
): void => {
  scene.traverse((child: any) => {
    if (child.isMesh) {
      const material = Array.isArray(child.material) ? child.material[0] : child.material;
      
      // Enable shadows
      child.castShadow = true;
      child.receiveShadow = true;

      // Extract and store assembly mark from metadata
      extractMeshMetadata(child);

      // Check if this is a fastener
      if (isFastenerMesh(child)) {
        processFastenerMesh(child, edgeLines);
        return;
      }

      // For non-fasteners, enable vertex colors from GLTF
      if (material && material.isMeshStandardMaterial) {
        // CRITICAL: Enable vertex colors to use IFC material colors
        material.vertexColors = true;
        material.needsUpdate = true;
        
        // Adjust material properties for better visibility
        material.metalness = 0.1;  // Less metallic = brighter
        material.roughness = 0.7;  // Keep some roughness
      } else if (!material) {
        // Only create default material if none exists
        child.material = new THREE.MeshStandardMaterial({
          color: 0x8888aa,
          metalness: 0.1,
          roughness: 0.7,
          vertexColors: true  // Enable vertex colors
        });
      }
      
      // Store mesh for async edge generation (don't generate edges synchronously)
      meshesToProcessForEdges.push(child);
    }
  });
};

/**
 * Loads assembly mapping from the backend API and applies it to all meshes.
 */
export const loadAndApplyAssemblyMapping = async (
  scene: THREE.Group,
  filename: string
): Promise<void> => {
  try {
    // Add timestamp to avoid caching
    const response = await fetch(`/api/assembly-mapping/${filename}?t=${Date.now()}`);
    if (!response.ok) {
      console.warn('Failed to load assembly mapping:', response.statusText);
      return;
    }
    
    const mapping = await response.json();
    
    // Debug: Check if plate_thickness is in the mapping
    const plateEntries = Object.entries(mapping).filter(([_id, entry]: [string, any]) => entry.element_type === 'IfcPlate');
    if (plateEntries.length > 0) {
      const sampleEntry = plateEntries[0][1] as any;
      console.log('[ASSEMBLY_MAPPING] Sample plate entry from API:', sampleEntry);
      console.log('[ASSEMBLY_MAPPING] Has plate_thickness:', 'plate_thickness' in sampleEntry);
    }
    
    // Store mapping in scene userData
    if (!scene.userData) scene.userData = {};
    scene.userData.assemblyMapping = mapping;
    
    // Apply mapping to all meshes
    let appliedCount = 0;
    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (!child.userData) child.userData = {};
        
        // Try to get product_id from various sources
        let productId: number | null = null;
        
        if (child.userData.product_id) {
          productId = child.userData.product_id;
        } else if (child.userData.expressID) {
          productId = child.userData.expressID;
        } else if (child.userData.id) {
          productId = child.userData.id;
        } else if ((child as any).metadata?.product_id) {
          productId = (child as any).metadata.product_id;
        } else if (child.name) {
          // Try to parse from name (format might be "elementType_productID" or "elementType_productID_assemblyMark")
          const parts = child.name.split('_');
          if (parts.length >= 2) {
            const parsed = parseInt(parts[1]);
            if (!isNaN(parsed)) productId = parsed;
          }
        }
        
        // CRITICAL: Always set product_id if we found it, even if not in mapping
        // This ensures selection and filtering work correctly
        if (productId) {
          child.userData.product_id = productId;
          
          // If this product is in the mapping, apply the mapping data
          if (mapping[productId]) {
            child.userData.assembly_mark = mapping[productId].assembly_mark;
            child.userData.assembly_id = mapping[productId].assembly_id || null;
            child.userData.type = mapping[productId].element_type;
            
            // Store plate thickness if available (even if it's "N/A")
            if ('plate_thickness' in mapping[productId]) {
              child.userData.plate_thickness = mapping[productId].plate_thickness;
            } else if (mapping[productId].element_type === 'IfcPlate') {
              console.warn(`[ASSEMBLY_MAPPING] Plate ${productId} missing plate_thickness in mapping`);
              child.userData.plate_thickness = "N/A";
            }
            
            // Store profile_name if available (for beams, columns, members)
            const elementType = mapping[productId].element_type;
            if (elementType === 'IfcBeam' || elementType === 'IfcColumn' || elementType === 'IfcMember') {
              if ('profile_name' in mapping[productId]) {
                child.userData.profile_name = mapping[productId].profile_name;
              } else {
                console.warn(`[ASSEMBLY_MAPPING] Profile element ${productId} (${elementType}) missing profile_name in mapping`);
                child.userData.profile_name = "N/A";
              }
            }
            
            appliedCount++;
          } else {
            // Product not in mapping - still set basic info from mesh name/metadata
            if (!child.userData.type && child.name) {
              const parts = child.name.split('_');
              if (parts.length >= 1 && parts[0]) {
                child.userData.type = parts[0];
              }
            }
            
            // Set profile_name for profile elements even if not in mapping
            const elementType = child.userData.type || (child.name ? child.name.split('_')[0] : null);
            if (elementType === 'IfcBeam' || elementType === 'IfcColumn' || elementType === 'IfcMember') {
              if (!child.userData.profile_name) {
                child.userData.profile_name = "N/A";
              }
            }
            
            // Set plate_thickness for plates even if not in mapping
            if (elementType === 'IfcPlate') {
              if (!child.userData.plate_thickness) {
                child.userData.plate_thickness = "N/A";
              }
            }
            
            // Try to extract assembly_mark from mesh name if available
            if (!child.userData.assembly_mark && child.name) {
              const parts = child.name.split('_');
              if (parts.length >= 3) {
                child.userData.assembly_mark = parts.slice(2).join('_');
              }
            }
          }
        } else {
          // No product_id found - try to set type from name as fallback
          if (!child.userData.type && child.name) {
            const parts = child.name.split('_');
            if (parts.length >= 1 && parts[0]) {
              child.userData.type = parts[0];
            }
          }
          
          // Still set profile_name and plate_thickness based on element type
          const elementType = child.userData.type || (child.name ? child.name.split('_')[0] : null);
          if (elementType === 'IfcBeam' || elementType === 'IfcColumn' || elementType === 'IfcMember') {
            if (!child.userData.profile_name) {
              child.userData.profile_name = "N/A";
            }
          }
          if (elementType === 'IfcPlate') {
            if (!child.userData.plate_thickness) {
              child.userData.plate_thickness = "N/A";
            }
          }
        }
      }
    });
    
    console.log(`Loaded assembly mapping for ${Object.keys(mapping).length} products, applied to ${appliedCount} meshes`);
  } catch (error) {
    console.warn('Failed to load assembly mapping:', error);
  }
};

/**
 * Main function to load a GLTF model with all processing.
 */
export const loadGLTFModel = async (options: LoadGLTFOptions): Promise<LoadGLTFResult> => {
  const { filename, gltfPath, gltfAvailable = false, onConversionStatus } = options;
  
  if (!filename) {
    throw new Error('No filename provided to loadGLTFModel');
  }

  console.log('[IFCViewer] Starting loadGLTF, filename:', filename, 'gltfPath:', gltfPath, 'gltfAvailable:', gltfAvailable);

  // Determine glTF path
  const gltfFilename = gltfPath || `/api/gltf/${filename.replace('.ifc', '.glb').replace('.IFC', '.glb')}`;
  console.log('[IFCViewer] glTF filename to load:', gltfFilename);
  
  // Check if glTF file exists
  let gltfExists = gltfAvailable;
  if (!gltfExists) {
    gltfExists = await checkGLTFExists(gltfFilename);
  }

  if (!gltfExists) {
    // Trigger conversion
    if (onConversionStatus) {
      onConversionStatus('Converting IFC to glTF... This may take a moment.');
    }
    
    const convertData = await convertIFCToGLTF(filename);
    
    // If conversion was successful, check if file exists
    if (convertData.gltf_path) {
      gltfExists = await checkGLTFExists(convertData.gltf_path);
    }
    
    // If still not exists, poll for conversion completion
    if (!gltfExists) {
      gltfExists = await pollForGLTFFile(gltfFilename, 60, (attempt) => {
        if (onConversionStatus) {
          onConversionStatus(`Converting IFC to glTF... (${attempt}s)`);
        }
      });
      
      if (!gltfExists) {
        console.error('IFCViewer: glTF conversion timed out after 60 seconds');
        throw new Error('glTF conversion timed out. Please try again.');
      }
    }
  }

  if (onConversionStatus) {
    onConversionStatus('Loading 3D model...');
  }

  // Load the glTF file
  const scene = await loadGLTFFile(gltfFilename);

  // Update world matrix before calculating bounding box
  scene.updateMatrixWorld(true);
  
  // Apply Z-up to Y-up transformation
  scene.rotation.x = -Math.PI / 2;

  // Process meshes
  const edgeLines: THREE.LineSegments[] = [];
  const meshesToProcessForEdges: any[] = [];
  
  processMeshes(scene, edgeLines, meshesToProcessForEdges);

  // Store edge lines reference in scene userData
  if (!scene.userData) scene.userData = {};
  scene.userData.edgeLines = edgeLines;

  // Load assembly mapping
  await loadAndApplyAssemblyMapping(scene, filename);

  console.log('[IFCViewer] Model loaded and processed successfully');
  console.log('[IFCViewer] Edge generation disabled for instant display - model ready!');

  return {
    scene,
    edgeLines,
    meshesToProcessForEdges
  };
};

