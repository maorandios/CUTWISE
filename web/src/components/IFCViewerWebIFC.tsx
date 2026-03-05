import { useEffect, useRef, useState, memo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as WebIFC from 'web-ifc'
import { ContextMenu } from './IFCViewer/components'
import { ContextMenuState, ElementData, SelectionMode } from './IFCViewer/types'
import { LottieLoader } from './LottieLoader'

interface IFCViewerWebIFCProps {
  filename: string | null
  isVisible?: boolean
  selectedProfiles?: Set<string>
  backgroundColor?: string
}

const IFCViewerWebIFC = memo(function IFCViewerWebIFC({ filename, isVisible = true, selectedProfiles = new Set(), backgroundColor = '#F9FAFB' }: IFCViewerWebIFCProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const ifcApiRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isLoadingRef = useRef<boolean>(false)
  const selectedMeshRef = useRef<THREE.Mesh | null>(null)
  const selectedMeshesRef = useRef<THREE.Mesh[]>([])
  const selectedProductIdsRef = useRef<number[]>([])
  const isPointerDownRef = useRef<boolean>(false)
  const dragStartedRef = useRef<boolean>(false)
  const downPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const DRAG_THRESHOLD_PX = 4
  const selectionModeRef = useRef<SelectionMode>('parts')
  const meshLookupRef = useRef<Map<string, THREE.Mesh[]>>(new Map()) // Cache: profileName -> meshes
  const previousSelectedProfilesRef = useRef<Set<string>>(new Set()) // Track what was selected before
  const renderRequestedRef = useRef<boolean>(false) // Throttle renders
  
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string>('')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('parts')
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    element: null,
    productId: null,
    assemblyId: null
  })
  const [elementData, setElementData] = useState<ElementData>({
    loading: false,
    data: null,
    error: null
  })
  const [selectedElement, setSelectedElement] = useState<THREE.Mesh | null>(null)

  // Preload the animation on component mount
  useEffect(() => {
    fetch('/animations/Abstract Isometric Loader.json')
      .then(response => response.json())
      .catch(error => console.error('Error preloading animation:', error))
  }, [])

  // Helper function to build mesh lookup cache (called once after model loads)
  const buildMeshLookup = (modelGroup: THREE.Group) => {
    const lookup = new Map<string, THREE.Mesh[]>()
    
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData.isEdge) {
        const profileName = child.userData.profile_name
        if (profileName) {
          if (!lookup.has(profileName)) {
            lookup.set(profileName, [])
          }
          lookup.get(profileName)!.push(child)
        }
      }
    })
    
    console.log(`[CACHE] Built mesh lookup: ${lookup.size} profiles, ${Array.from(lookup.values()).reduce((sum, arr) => sum + arr.length, 0)} meshes`)
    return lookup
  }

  // Helper function to update materials - ONLY updates changed profiles (ultra-fast)
  const updateProfileMaterials = (selectedProfiles: Set<string>, previousProfiles: Set<string>) => {
    const meshLookup = meshLookupRef.current
    if (meshLookup.size === 0) return // No cache yet
    
    // Find profiles that changed
    const added = new Set([...selectedProfiles].filter(p => !previousProfiles.has(p)))
    const removed = new Set([...previousProfiles].filter(p => !selectedProfiles.has(p)))
    
    let updatedMeshes = 0
    
    // Update newly selected profiles (wireframe -> solid with color)
    added.forEach(profileName => {
      const meshes = meshLookup.get(profileName)
      if (meshes) {
        meshes.forEach(mesh => {
          if (mesh.userData.originalMaterial) {
            mesh.material = mesh.userData.originalMaterial
            mesh.visible = true // Show the solid mesh
            if (mesh.userData.edgeLine) {
              mesh.userData.edgeLine.visible = false // Hide edges when selected
            }
            updatedMeshes++
          }
        })
      }
    })
    
    // Update newly deselected profiles (solid color -> wireframe only)
    removed.forEach(profileName => {
      const meshes = meshLookup.get(profileName)
      if (meshes) {
        meshes.forEach(mesh => {
          mesh.visible = false // Hide the solid mesh
          if (mesh.userData.edgeLine) {
            mesh.userData.edgeLine.visible = true // Show only edges
          }
          updatedMeshes++
        })
      }
    })
    
    if (updatedMeshes > 0) {
      console.log(`[MATERIALS] Updated ${updatedMeshes} meshes (${added.size} added, ${removed.size} removed)`)
    }
  }
  
  // Helper function to apply initial materials (all meshes wireframe on first load)
  const applyInitialMaterials = (selectedProfiles: Set<string>) => {
    const meshLookup = meshLookupRef.current
    if (meshLookup.size === 0) return
    
    let coloredMeshes = 0
    let wireframeMeshes = 0
    
    // Iterate through all profiles
    meshLookup.forEach((meshes, profileName) => {
      const isSelected = selectedProfiles.has(profileName)
      
      meshes.forEach(mesh => {
        if (isSelected) {
          // Selected: show solid with color, hide edges
          mesh.material = mesh.userData.originalMaterial
          mesh.visible = true
          if (mesh.userData.edgeLine) {
            mesh.userData.edgeLine.visible = false
          }
          coloredMeshes++
        } else {
          // Unselected: hide solid, show only edges (wireframe)
          mesh.visible = false
          if (mesh.userData.edgeLine) {
            mesh.userData.edgeLine.visible = true
          }
          wireframeMeshes++
        }
      })
    })
    
    console.log(`[MATERIALS] Initial: ${coloredMeshes} meshes colored, ${wireframeMeshes} meshes as wireframe`)
  }


  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) {
      console.log('[IFCM] Container ref not ready')
      return
    }

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    if (width === 0 || height === 0) {
      return
    }

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColor) // Background color from props
    sceneRef.current = scene

    // Camera - Optimized for close-up viewing
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.01, // Very close near plane (was 0.1) - allows zooming very close
      10000
    )
    camera.position.set(50, 50, 50)
    cameraRef.current = camera

    // Renderer - Optimized for performance
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, // Enable for smooth edges (no transparency issues)
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: false
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Full quality
    renderer.shadowMap.enabled = false
    renderer.sortObjects = false // No need to sort opaque objects
    
    // Enable frustum culling for better performance when zoomed out
    renderer.info.autoReset = false
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls - Optimized for instant, responsive movement
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false // Disable damping for instant response
    controls.rotateSpeed = 1.5 // Faster rotation for more responsive feel
    controls.zoomSpeed = 2.0 // Faster zoom
    controls.panSpeed = 2.0 // Faster panning
    controls.minDistance = 0.01 // Allow zooming very close
    controls.maxDistance = 10000 // Allow zooming very far
    controls.enablePan = true
    controls.screenSpacePanning = true // Better panning behavior
    
    // All edges are hidden by default for maximum performance
    // No adaptive LOD needed since edges are not rendered
    
    controlsRef.current = controls

    // Lights - Minimal setup for maximum performance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8) // High ambient for less computation
    scene.add(ambientLight)

    // Single directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(100, 150, 100)
    scene.add(directionalLight)

    // No grid for cleaner appearance

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // Throttled render function - prevents multiple renders in same frame
    const requestRender = () => {
      if (!renderRequestedRef.current) {
        renderRequestedRef.current = true
        requestAnimationFrame(() => {
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            const startTime = performance.now()
            rendererRef.current.render(sceneRef.current, cameraRef.current)
            const renderTime = performance.now() - startTime
            if (renderTime > 16) { // Log if slower than 60fps
              console.log(`[RENDER] Slow render: ${renderTime.toFixed(1)}ms`)
            }
          }
          renderRequestedRef.current = false
        })
      }
    }
    
    // Trigger render when controls change (camera moves) - throttled via requestAnimationFrame
    controls.addEventListener('change', requestRender)
    
    // Initial render
    requestRender()

    // Pointer event handlers for selection
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return // Only left-click
      
      isPointerDownRef.current = true
      dragStartedRef.current = false
      downPosRef.current = { x: event.clientX, y: event.clientY }
      
      // Shift + Left: panning
      if (event.shiftKey) {
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN
        return
      }
      
      // Left-click: orbit
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
    }
    
    const onPointerMove = (event: PointerEvent) => {
      if (!isPointerDownRef.current) return
      
      const dx = event.clientX - downPosRef.current.x
      const dy = event.clientY - downPosRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > DRAG_THRESHOLD_PX) {
        dragStartedRef.current = true
      }
    }
    
    const onPointerUp = async (event: PointerEvent) => {
      if (event.button !== 0) return // Only left-click
      
      const wasDragging = dragStartedRef.current
      isPointerDownRef.current = false
      dragStartedRef.current = false
      
      // If dragging occurred, don't select
      if (wasDragging) {
        return
      }
      
      // Handle selection
      if (!containerRef.current || !camera || !modelRef.current) {
        return
      }
      
      // Ignore clicks on buttons or control panel
      const target = event.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.absolute.bottom-4')) {
        return
      }
      
      const rect = containerRef.current.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const clickY = event.clientY - rect.top
      
      // Verify click is within bounds
      if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
        return
      }
      
      const mouseX = (clickX / rect.width) * 2 - 1
      const mouseY = -((clickY / rect.height) * 2 - 1)
      
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)
      
      // Get pickable meshes
      const pickables: THREE.Mesh[] = []
      modelRef.current.traverse((child: any) => {
        if (child.isMesh && child.visible) {
          if (!child.isLine && !child.isLineSegments && !(child.name && child.name.includes('_edges'))) {
            pickables.push(child)
          }
        }
      })
      
      const intersections = raycaster.intersectObjects(pickables, true)
      const validIntersections = intersections.filter(intersection => {
        const obj = intersection.object as any
        return obj.isMesh && obj.visible && intersection.distance > 0 && intersection.distance < camera.far
      })
      
      // If no intersections, clear selection
      if (validIntersections.length === 0) {
        clearSelection()
        setSelectedElement(null)
        return
      }
      
      // Get first valid hit
      const hit = validIntersections[0]
      const hitObject = hit.object as THREE.Mesh
      
      const hitProductId = hitObject.userData?.product_id || 
                          hitObject.userData?.expressID || 
                          hitObject.userData?.id ||
                          ((hitObject as any).metadata?.product_id)
      
      // Toggle selection if same object clicked
      if (selectedProductIdsRef.current.length === 1 && 
          selectedProductIdsRef.current[0] === hitProductId) {
        clearSelection()
        setSelectedElement(null)
      } else {
        // Select the hit object
        selectMesh(hitObject)
      }
    }
    
    // Handle right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      
      // Don't show context menu if clicking on UI elements
      const target = e.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.absolute.bottom-4')) {
        return
      }
      
      // Only show context menu if an element is selected
      const hasMesh = selectedMeshRef.current !== null
      const hasProductIds = selectedProductIdsRef.current.length > 0
      const hasSelection = hasMesh || hasProductIds
      
      if (!hasSelection) {
        setContextMenu({ visible: false, x: 0, y: 0, element: null, productId: null, assemblyId: null })
        return
      }
      
      let selectedMesh: THREE.Mesh | null = selectedMeshRef.current
      let selectedProductId: number | null = null
      
      if (selectedMesh) {
        const rawProductId = selectedMesh.userData?.product_id || 
                           selectedMesh.userData?.expressID || 
                           selectedMesh.userData?.id ||
                           ((selectedMesh as any).metadata?.product_id) ||
                           null
        selectedProductId = rawProductId !== null ? Number(rawProductId) : null
        if (selectedProductId !== null && isNaN(selectedProductId)) {
          selectedProductId = null
        }
      }
      
      if (selectedMesh && selectedProductId !== null) {
        // Get assembly_id if in assembly mode
        let assemblyId: number | null = null
        if (selectionModeRef.current === 'assemblies') {
          assemblyId = selectedMesh.userData?.assembly_id || null
        }
        
        console.log('[IFCM] Context menu:', {
          selectionMode: selectionModeRef.current,
          productId: selectedProductId,
          assemblyId,
          userData: selectedMesh.userData
        })
        
        // Fetch element data
        if (selectionModeRef.current === 'assemblies' && assemblyId) {
          console.log('[IFCM] Fetching assembly data for:', assemblyId)
          fetchAssemblyData(assemblyId)
        } else {
          console.log('[IFCM] Fetching element data for:', selectedProductId)
          fetchElementData(selectedProductId)
        }
        
        // Show context menu
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          element: selectedMesh,
          productId: selectedProductId,
          assemblyId: assemblyId
        })
      } else {
        setContextMenu({ visible: false, x: 0, y: 0, element: null, productId: null, assemblyId: null })
      }
    }
    
    // Add event listeners
    // DISABLED: Element selection and right-click info (hidden for now)
    // renderer.domElement.addEventListener('pointerdown', onPointerDown)
    // renderer.domElement.addEventListener('pointermove', onPointerMove)
    // renderer.domElement.addEventListener('pointerup', onPointerUp)
    // renderer.domElement.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('resize', handleResize)
      // DISABLED: Element selection and right-click info (hidden for now)
      // renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      // renderer.domElement.removeEventListener('pointermove', onPointerMove)
      // renderer.domElement.removeEventListener('pointerup', onPointerUp)
      // renderer.domElement.removeEventListener('contextmenu', handleContextMenu)
      
      // Remove controls change listener
      controls.removeEventListener('change', requestRender)
      
      renderer.dispose()
      controls.dispose()
    }
  }, [])

  // Load IFC model when filename changes
  useEffect(() => {
    if (!filename || !sceneRef.current) {
      return
    }

    const loadModel = async () => {
      // Prevent double-loading
      if (isLoadingRef.current) {
        return
      }
      
      isLoadingRef.current = true
      const startTime = performance.now()
      setIsLoading(true)
      setLoadError(null)
      setLoadingStatus('We are loading up your IFC model')

      try {
        // Initialize web-ifc API
        if (!ifcApiRef.current) {
          console.log('[IFCM] Creating new IfcAPI instance')
          const ifcApi = new WebIFC.IfcAPI()
          ifcApi.SetWasmPath('/')
          console.log('[IFCM] Initializing IfcAPI...')
          await ifcApi.Init()
          ifcApiRef.current = ifcApi
          console.log('[IFCM] IfcAPI initialized successfully')
        }

        const ifcApi = ifcApiRef.current

        // Fetch IFC file
        const response = await fetch(`/api/ifc/${encodeURIComponent(filename)}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch IFC file: ${response.statusText}`)
        }

        const data = await response.arrayBuffer()
        const ifcData = new Uint8Array(data)

        // Open model
        const modelID = ifcApi.OpenModel(ifcData, {
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: true
        })

        // Load all geometry
        const ifcMeshes = ifcApi.LoadAllGeometry(modelID)

        // Create Three.js group for the model
        const modelGroup = new THREE.Group()
        modelGroup.name = 'IFC Model'

        // Color map for different IFC types
        const colorMap: { [key: string]: number } = {
          'IFCBEAM': 0xB4B4DC,
          'IFCCOLUMN': 0xDCDCB4,
          'IFCMEMBER': 0xC8C8DC,
          'IFCPLATE': 0xA0A0C0,
          'IFCSLAB': 0xB0B0B0,
          'IFCWALL': 0xC0C0C0,
          'IFCFASTENER': 0x8B6914,
          'IFCMECHANICALFASTENER': 0x8B6914,
          'IFCDISCRETEACCESSORY': 0x8B6914
        }

        let meshCount = 0

        // Process each mesh
        for (let i = 0; i < ifcMeshes.size(); i++) {
          const ifcMesh = ifcMeshes.get(i)
          const expressID = ifcMesh.expressID

          // Get element type
          let elementType = 'UNKNOWN'
          try {
            const properties = ifcApi.GetLine(modelID, expressID)
            elementType = properties?.constructor?.name?.toUpperCase() || 'UNKNOWN'
          } catch (e) {
            // Ignore property errors
          }

          // Process all geometries for this mesh
          const geometries = ifcMesh.geometries
          for (let j = 0; j < geometries.size(); j++) {
            const geometry = geometries.get(j)
            const geometryID = geometry.geometryExpressID
            
            // Get geometry data
            const geometryData = ifcApi.GetGeometry(modelID, geometryID)
            const verts = ifcApi.GetVertexArray(geometryData.GetVertexData(), geometryData.GetVertexDataSize())
            const indices = ifcApi.GetIndexArray(geometryData.GetIndexData(), geometryData.GetIndexDataSize())

            if (verts.length === 0 || indices.length === 0) continue

            // Create Three.js geometry
            const bufferGeometry = new THREE.BufferGeometry()
            
            // web-ifc returns interleaved vertex data: [x,y,z,nx,ny,nz, x,y,z,nx,ny,nz, ...]
            // We need to extract only positions (first 3 values of each 6)
            const vertexCount = verts.length / 6
            const positions = new Float32Array(vertexCount * 3)
            for (let k = 0; k < vertexCount; k++) {
              positions[k * 3] = verts[k * 6]          // x
              positions[k * 3 + 1] = verts[k * 6 + 1]  // y
              positions[k * 3 + 2] = verts[k * 6 + 2]  // z
            }
            
            bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
            bufferGeometry.computeVertexNormals()
            
            // Optimize geometry for faster rendering
            bufferGeometry.computeBoundingSphere()
            bufferGeometry.computeBoundingBox()

            // Apply transformation matrix from IFC
            const flatTransform = geometry.flatTransformation
            if (flatTransform && flatTransform.length === 16) {
              const matrix = new THREE.Matrix4()
              matrix.fromArray(Array.from(flatTransform))
              bufferGeometry.applyMatrix4(matrix)
            }

            // Get color from IFC geometry (real color from the file)
            const ifcColor = geometry.color
            let color: number
            if (ifcColor && (ifcColor.x !== undefined && ifcColor.y !== undefined && ifcColor.z !== undefined)) {
              // Convert IFC color (0-1 range) to Three.js color (0x000000-0xffffff)
              const r = Math.floor(ifcColor.x * 255)
              const g = Math.floor(ifcColor.y * 255)
              const b = Math.floor(ifcColor.z * 255)
              color = (r << 16) | (g << 8) | b
            } else {
              // Fallback to type-based color if no color in IFC
              color = colorMap[elementType] || 0x999999
            }

            // Create original material with real IFC color
            const originalMaterial = new THREE.MeshLambertMaterial({
              color: color,
              side: THREE.DoubleSide,
              flatShading: false,
              opacity: 1.0,
              transparent: false
            })
            
            // Create gray opaque material for unselected elements (fast, no transparency)
            const grayMaterial = new THREE.MeshLambertMaterial({
              color: 0xE8E8E8, // Very light gray
              side: THREE.DoubleSide,
              flatShading: false,
              transparent: false, // Opaque for maximum performance
              opacity: 1.0
            })

            // Create mesh - will be hidden by default (wireframe only for unselected)
            const mesh = new THREE.Mesh(bufferGeometry, originalMaterial)
            mesh.castShadow = false
            mesh.receiveShadow = false
            mesh.frustumCulled = true
            mesh.matrixAutoUpdate = false
            mesh.updateMatrix()
            mesh.visible = false // Hidden by default - will show only edges until selected
            mesh.userData = {
              product_id: expressID,
              type: elementType,
              geometry_id: geometryID,
              originalMaterial: originalMaterial, // Store original for selection
              grayMaterial: grayMaterial, // Keep for backward compatibility
              originalColor: color
              // profile_name will be set by loadAssemblyMapping
            }

            modelGroup.add(mesh)
            
            // Add edge lines for all elements - essential to distinguish parts with same color
            try {
              // Use higher angle threshold for better performance while maintaining visibility
              const edges = new THREE.EdgesGeometry(bufferGeometry, 25) // 25 degree threshold
              
              // Use light gray for wireframe edges (for unselected elements)
              const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0xCCCCCC, // Light gray for wireframe
                linewidth: 1,
                transparent: false, // Disable transparency for performance
                depthTest: true,
                depthWrite: true
              })
              
              const edgeLine = new THREE.LineSegments(edges, lineMaterial)
              edgeLine.frustumCulled = true // Enable frustum culling
              edgeLine.matrixAutoUpdate = false // Static geometry
              edgeLine.updateMatrix() // Update once
              edgeLine.visible = true // Visible by default - shows wireframe for unselected elements
              edgeLine.userData = {
                isEdgeLine: true,
                parentMesh: mesh
              }
              edgeLine.name = `${mesh.name}_edges`
              // Match parent mesh layer for consistent visibility
              edgeLine.layers.set(0) // Start on default layer

              // Store reference to edge line in mesh userData
              mesh.userData.edgeLine = edgeLine

              modelGroup.add(edgeLine)
            } catch (e) {
              // Ignore edge creation errors for complex geometries
            }
            
            meshCount++
            
          }

          // Update progress
          // Keep the same loading message throughout
        }

        // Make sure model group is visible
        modelGroup.visible = true
        
        // Add model to scene
        sceneRef.current!.add(modelGroup)
        modelRef.current = modelGroup

        // Load assembly mapping from backend
        await loadAssemblyMapping(modelGroup, filename)

        // Build mesh lookup cache for fast profile-based updates
        meshLookupRef.current = buildMeshLookup(modelGroup)
        
        // Apply initial selection (all meshes already have gray opaque material, only color selected ones)
        applyInitialMaterials(selectedProfiles)
        previousSelectedProfilesRef.current = new Set(selectedProfiles)
        
        // Render after applying selection
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }

        // Fit camera to model
        const box = new THREE.Box3().setFromObject(modelGroup)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())

        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = cameraRef.current!.fov * (Math.PI / 180)
        let distance = Math.abs(maxDim / Math.tan(fov / 2))
        distance *= 1.5 // Add some padding

        // Position camera to look at model from an isometric angle
        cameraRef.current!.position.set(
          center.x + distance,
          center.y + distance,
          center.z + distance
        )
        cameraRef.current!.lookAt(center)
        controlsRef.current!.target.copy(center)
        controlsRef.current!.update()
        
        // Force a render
        rendererRef.current!.render(sceneRef.current!, cameraRef.current!)

        const endTime = performance.now()
        const totalTime = ((endTime - startTime) / 1000).toFixed(2)
        console.log(`[IFCM] ✅ Model loaded: ${meshCount} meshes in ${totalTime}s`)
        
        // Ensure minimum 5 seconds of loading display
        const elapsedTime = endTime - startTime
        const minimumLoadTime = 5000 // 5 seconds in milliseconds
        const remainingTime = Math.max(0, minimumLoadTime - elapsedTime)
        
        if (remainingTime > 0) {
          console.log(`[IFCM] Waiting ${(remainingTime / 1000).toFixed(2)}s to meet minimum load time`)
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        
        setLoadingStatus('')
        setIsLoading(false)
        isLoadingRef.current = false

      } catch (error) {
        console.error('[IFCM] Error:', error)
        setLoadError(error instanceof Error ? error.message : 'Unknown error')
        setIsLoading(false)
        setLoadingStatus('')
        isLoadingRef.current = false
      }
    }

    loadModel()

    // Cleanup on unmount or filename change
    return () => {
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current)
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
        modelRef.current = null
      }
      // Clear mesh lookup cache
      meshLookupRef.current.clear()
      previousSelectedProfilesRef.current.clear()
    }
  }, [filename])

  // Update visualization when selectedProfiles changes (ultra-fast - only updates changed profiles)
  useEffect(() => {
    if (!modelRef.current || meshLookupRef.current.size === 0) return
    
    // Only update meshes for profiles that changed (added or removed)
    updateProfileMaterials(selectedProfiles, previousSelectedProfilesRef.current)
    
    // Update previous state
    previousSelectedProfilesRef.current = new Set(selectedProfiles)
    
    // Trigger a throttled render to show the changes
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      if (!renderRequestedRef.current) {
        renderRequestedRef.current = true
        requestAnimationFrame(() => {
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current)
          }
          renderRequestedRef.current = false
        })
      }
    }
  }, [selectedProfiles])
  // Helper function to clear selection
  const clearSelection = () => {
    // Restore original materials
    selectedMeshesRef.current.forEach(mesh => {
      if (mesh.userData.originalMaterial) {
        mesh.material = mesh.userData.originalMaterial
        delete mesh.userData.originalMaterial
      }
      
      // Also restore edge line visibility if it exists
      if (mesh.userData.edgeLine) {
        mesh.userData.edgeLine.visible = true
      }
    })
    
    selectedMeshRef.current = null
    selectedMeshesRef.current = []
    selectedProductIdsRef.current = []
  }

  // Helper function to select a mesh
  const selectMesh = (mesh: THREE.Mesh) => {
    // Clear previous selection
    clearSelection()
    
    const productId = mesh.userData?.product_id || 
                     mesh.userData?.expressID || 
                     mesh.userData?.id ||
                     ((mesh as any).metadata?.product_id)
    
    console.log('[IFCM] selectMesh called:', {
      selectionMode: selectionModeRef.current,
      productId,
      assembly_id: mesh.userData?.assembly_id,
      assembly_mark: mesh.userData?.assembly_mark,
      userData: mesh.userData
    })
    
    // If in assembly mode, select all meshes with the same assembly_id
    if (selectionModeRef.current === 'assemblies') {
      const assemblyId = mesh.userData?.assembly_id
      
      console.log('[IFCM] Assembly mode, assemblyId:', assemblyId)
      
      if (assemblyId && modelRef.current) {
        // Find all meshes with the same assembly_id
        const assemblyMeshes: THREE.Mesh[] = []
        modelRef.current.traverse((child: any) => {
          if (child.isMesh && child.userData?.assembly_id === assemblyId) {
            assemblyMeshes.push(child)
          }
        })
        
        console.log('[IFCM] Found', assemblyMeshes.length, 'meshes in assembly')
        
        // Highlight all assembly meshes
        assemblyMeshes.forEach(m => {
          if (!m.userData.originalMaterial) {
            m.userData.originalMaterial = m.material
          }
          const selectionMaterial = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide,
            transparent: false
          })
          m.material = selectionMaterial
          
          // Hide edge lines during selection for cleaner highlight
          if (m.userData.edgeLine) {
            m.userData.edgeLine.visible = false
          }
        })
        
        selectedMeshRef.current = mesh
        selectedMeshesRef.current = assemblyMeshes
        
        // Store all product IDs in the assembly
        const productIds = assemblyMeshes
          .map(m => m.userData?.product_id || m.userData?.expressID || m.userData?.id)
          .filter(id => id !== undefined)
        selectedProductIdsRef.current = productIds
        
        console.log('[IFCM] Selected product IDs:', productIds)
      } else {
        console.log('[IFCM] No assembly_id found, selecting single mesh')
        // No assembly_id, select just the single mesh
        selectSingleMesh(mesh, productId)
      }
    } else {
      // Parts mode - select single mesh
      selectSingleMesh(mesh, productId)
    }
    
    setSelectedElement(mesh)
  }
  
  // Helper to select a single mesh
  const selectSingleMesh = (mesh: THREE.Mesh, productId: any) => {
    // Store original material
    if (!mesh.userData.originalMaterial) {
      mesh.userData.originalMaterial = mesh.material
    }
    
    // Apply selection material (yellow highlight)
    const selectionMaterial = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
      transparent: false
    })
    mesh.material = selectionMaterial
    
    // Hide edge lines during selection for cleaner highlight
    if (mesh.userData.edgeLine) {
      mesh.userData.edgeLine.visible = false
    }
    
    // Update refs
    selectedMeshRef.current = mesh
    selectedMeshesRef.current = [mesh]
    
    if (productId !== undefined) {
      selectedProductIdsRef.current = [productId]
    }
  }

  // Helper function to fetch element data from backend
  const fetchElementData = async (productId: number) => {
    if (!filename) return
    
    setElementData({ loading: true, data: null, error: null })
    
    try {
      const encodedFilename = encodeURIComponent(filename)
      const url = `/api/element-full/${productId}?filename=${encodedFilename}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[IFCM] API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Failed to fetch element data (${response.status}): ${response.statusText}`)
      }
      
      const data = await response.json()
      setElementData({ loading: false, data, error: null })
    } catch (error) {
      console.error('[IFCM] Error fetching element data:', error)
      setElementData({ 
        loading: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch element data' 
      })
    }
  }

  // Helper function to fetch assembly data from backend
  const fetchAssemblyData = async (assemblyId: number) => {
    if (!filename) return
    
    setElementData({ loading: true, data: null, error: null })
    
    try {
      const encodedFilename = encodeURIComponent(filename)
      const url = `/api/element-full/${assemblyId}?filename=${encodedFilename}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[IFCM] API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Failed to fetch assembly data (${response.status}): ${response.statusText}`)
      }
      
      const data = await response.json()
      setElementData({ loading: false, data, error: null })
    } catch (error) {
      console.error('[IFCM] Error fetching assembly data:', error)
      setElementData({ 
        loading: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch assembly data' 
      })
    }
  }

  // Close context menu handler
  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, element: null, productId: null, assemblyId: null })
  }

  // Load assembly mapping from backend and apply to meshes
  const loadAssemblyMapping = async (modelGroup: THREE.Group, filename: string) => {
    try {
      console.log('[IFCM] Loading assembly mapping for:', filename)
      const encodedFilename = encodeURIComponent(filename)
      const url = `/api/assembly-mapping/${encodedFilename}`
      console.log('[IFCM] Fetching from:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.warn('[IFCM] Assembly mapping not available:', response.status, response.statusText)
        return
      }
      
      const mapping = await response.json()
      console.log('[IFCM] Assembly mapping loaded:', Object.keys(mapping).length, 'entries')
      console.log('[IFCM] Sample mapping entry:', mapping[Object.keys(mapping)[0]])
      
      // Store mapping in model userData
      if (!modelGroup.userData) modelGroup.userData = {}
      modelGroup.userData.assemblyMapping = mapping
      
      // Apply mapping to all meshes
      let appliedCount = 0
      let totalMeshes = 0
      modelGroup.traverse((child: any) => {
        if (child.isMesh) {
          totalMeshes++
          if (!child.userData) child.userData = {}
          
          // Try to get product_id from various sources
          let productId: number | null = null
          
          if (child.userData.product_id) {
            productId = child.userData.product_id
          } else if (child.userData.expressID) {
            productId = child.userData.expressID
          } else if (child.userData.id) {
            productId = child.userData.id
          } else if ((child as any).metadata?.product_id) {
            productId = (child as any).metadata.product_id
          }
          
          // Always set product_id if we found it
          if (productId !== null && productId !== undefined) {
            child.userData.product_id = productId
            
            // Look up assembly info in mapping
            const mappingEntry = mapping[productId]
            if (mappingEntry) {
              child.userData.assembly_id = mappingEntry.assembly_id
              child.userData.assembly_mark = mappingEntry.assembly_mark
              child.userData.type = mappingEntry.element_type || child.userData.type
              
              // Store profile_name from mapping (for beams, columns, members)
              if (mappingEntry.profile_name) {
                child.userData.profile_name = mappingEntry.profile_name
              }
              
              appliedCount++
              
              // Log first few applications for debugging
              if (appliedCount <= 3) {
                console.log('[IFCM] Applied mapping to mesh:', {
                  productId,
                  assembly_id: mappingEntry.assembly_id,
                  assembly_mark: mappingEntry.assembly_mark,
                  profile_name: mappingEntry.profile_name
                })
              }
            } else {
              // Log first few missing entries
              if (appliedCount <= 3) {
                console.log('[IFCM] No mapping found for product_id:', productId)
              }
            }
          }
        }
      })
      
      console.log('[IFCM] Applied assembly mapping to', appliedCount, 'of', totalMeshes, 'meshes')
    } catch (error) {
      console.error('[IFCM] Error loading assembly mapping:', error)
    }
  }

  if (!filename) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">No IFC file loaded</p>
          <p className="text-sm mt-2">Upload an IFC file to view it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* 3D Viewer Container */}
      <div ref={containerRef} className="w-full h-full" style={{ willChange: 'transform' }} />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center z-10 pointer-events-none">
          <LottieLoader 
            animationPath="/animations/Abstract Isometric Loader.json"
            width={600}
            height={600}
            overlay={false}
          />
          <p className="text-lg font-medium text-gray-500 -mt-16">{loadingStatus}</p>
        </div>
      )}

      {/* Error Display */}
      {loadError && (
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-5xl mb-4">⚠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Model</h3>
            <p className="text-gray-600 mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        contextMenu={contextMenu}
        elementData={elementData}
        selectionMode={selectionMode}
        onClose={handleCloseContextMenu}
      />

      {/* Control Panel - Selection Mode Toggle */}
      {/* DISABLED: Parts and Assemblies mode buttons (hidden for now) */}
      {/* <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setSelectionMode('parts')
              selectionModeRef.current = 'parts'
              clearSelection()
              setSelectedElement(null)
              console.log('[IFCM] Switched to Parts mode')
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectionMode === 'parts'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Select individual parts"
          >
            Parts
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setSelectionMode('assemblies')
              selectionModeRef.current = 'assemblies'
              clearSelection()
              setSelectedElement(null)
              console.log('[IFCM] Switched to Assemblies mode')
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectionMode === 'assemblies'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Select assemblies"
          >
            Assemblies
          </button>
        </div>
      </div> */}

    </div>
  )
})

export default IFCViewerWebIFC
