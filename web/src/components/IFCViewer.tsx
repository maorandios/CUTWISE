import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { IFCViewerProps, ClipPlaneKey, SelectionMode, MarkupTool, MarkupColor, ElementState, ContextMenuState, ElementData, MeasurementData, MarkupElement, TextElement, ModelBounds } from './IFCViewer/types'
import { LoadingState, ContextMenu, ControlPanel, MarkupCanvas, SelectedElementBanner } from './IFCViewer/components'
import { setupClickSelection } from './IFCViewer/managers'
import { 
  findClosestCorner, 
  findClosestEdgePoint, 
  calculateDotSize, 
  createMeasurementDot as createMeasurementDotUtil,
  createArrowHelper,
  calculateDistance,
  formatDistance,
  calculateMidpoint,
  projectToScreen,
  disposeObject,
  findMeshesByProductIds as findMeshesByProductIdsUtil,
  getAssemblyInfo as getAssemblyInfoUtil,
  findAllMeshesWithAssemblyId as findAllMeshesWithAssemblyIdUtil,
  getColorHex, 
  getLineWidth, 
  applyMarkupSettings as applyMarkupSettingsUtil,
  getCanvasContext as getCanvasContextUtil,
  setupCanvas as setupCanvasUtil,
  clearCanvas as clearCanvasUtil,
  getCanvasCoordinates as getCanvasCoordinatesUtil,
  drawPencilPath,
  drawArrow,
  drawCloud,
  redrawAllMarkups,
  captureScreenshot as captureScreenshotUtil,
  saveScreenshotToFile,
  copyScreenshotToClipboard,
  disableClipping,
  applyClipping,
  updateModelBounds,
  handleTransparent as handleTransparentUtil,
  handleHide as handleHideUtil,
  handleHideAllExcept as handleHideAllExceptUtil,
  handleShowAll as handleShowAllUtil,
  applyFiltersToModel
} from './IFCViewer/utils'

export default function IFCViewer({ filename, gltfPath, gltfAvailable = false, enableMeasurement = false, enableClipping = false, filters, report, isVisible = true }: IFCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const selectedMeshRef = useRef<THREE.Mesh | null>(null)
  const selectedMeshesRef = useRef<THREE.Mesh[]>([]) // Store multiple selected meshes for assembly mode
  const selectedProductIdsRef = useRef<number[]>([]) // Store product IDs for reliable lookup
  // Pointer state refs for drag detection and pivot management
  const isPointerDownRef = useRef<boolean>(false)
  const dragStartedRef = useRef<boolean>(false)
  const downPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const DRAG_THRESHOLD_PX = 4
  const pendingPivotRef = useRef<THREE.Vector3 | null>(null) // Store pivot point calculated on pointer down
  const isAnimatingPivotRef = useRef<boolean>(false) // Track if we're animating the pivot transition
  const animationStartTimeRef = useRef<number>(0) // Track animation start time
  const oldTargetRef = useRef<THREE.Vector3 | null>(null) // Store old target for animation
  const oldCameraPosRef = useRef<THREE.Vector3 | null>(null) // Store old camera position for animation
  const targetPivotRef = useRef<THREE.Vector3 | null>(null) // Store target pivot point for animation
  
  // Measurement refs
  const [measurementMode, setMeasurementMode] = useState<boolean>(false)
  const measurementModeRef = useRef<boolean>(false) // Ref to track measurement mode for event handlers
  const measurementPointsRef = useRef<THREE.Vector3[]>([]) // Store start and end points for current measurement
  const measurementLineRef = useRef<THREE.Line | null>(null) // Reference to the current measurement line
  const measurementLabelRef = useRef<THREE.Group | null>(null) // Reference to the distance label (legacy, for cleanup)
  const measurementLabelDivRef = useRef<HTMLDivElement | null>(null) // Reference to the HTML label div for current measurement
  const measurementDotsRef = useRef<THREE.Mesh[]>([]) // Store red dots for current measurement points
  const previewArrowRef = useRef<THREE.ArrowHelper | null>(null) // Arrow that follows cursor from start point
  
  // Store all completed measurements
  const allMeasurementsRef = useRef<Array<{
    arrow: THREE.ArrowHelper | null
    label: HTMLDivElement | null
    dots: THREE.Mesh[]
    start: THREE.Vector3
    end: THREE.Vector3
  }>>([])
  const hoverPreviewMarkerRef = useRef<THREE.Sprite | null>(null) // Preview marker when hovering over geometry
  
  // Clipping refs/state
  const [clippingMode, setClippingMode] = useState<boolean>(false)
  const clippingModeRef = useRef<boolean>(false)
  const [activeClipPlane, setActiveClipPlane] = useState<ClipPlaneKey | null>(null)
  const activeClipPlaneRef = useRef<ClipPlaneKey | null>(null)
  const [clipAmount, setClipAmount] = useState<number>(0) // 0..1 fraction of model size along normal
  const clipAmountRef = useRef<number>(0)
  
  const clippingPlaneRef = useRef<THREE.Plane | null>(null)
  const clippingHelperRef = useRef<THREE.Group | null>(null)
  const modelBoundsRef = useRef<{ min: THREE.Vector3; max: THREE.Vector3; size: THREE.Vector3; center: THREE.Vector3 } | null>(null)
  
  // Markup refs/state
  const [markupMode, setMarkupMode] = useState<boolean>(false)
  const [activeMarkupTool, setActiveMarkupTool] = useState<'pencil' | 'arrow' | 'cloud' | 'text' | null>(null)
  const [markupColor, setMarkupColor] = useState<'red' | 'black' | 'yellow' | 'green' | 'blue'>('red')
  const [markupThickness, setMarkupThickness] = useState<number>(3) // 1-5 levels (thin to bold)
  const markupCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const markupContainerRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef<boolean>(false)
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentPencilPathRef = useRef<Array<{ x: number; y: number }>>([]) // Store current pencil path points
  const lastPencilPointRef = useRef<{ x: number; y: number } | null>(null) // Last point for smooth curve drawing
  const markupElementsRef = useRef<Array<{
    type: 'pencil' | 'arrow' | 'cloud' | 'text'
    data: any
    id: string
    color?: string
    thickness?: number
    path?: Array<{ x: number; y: number }> // For pencil paths
  }>>([])
  const textElementsRef = useRef<Array<{
    id: string
    element: HTMLDivElement
    x: number
    y: number
  }>>([])
  
  // Keep measurementModeRef in sync with measurementMode state
  useEffect(() => {
    measurementModeRef.current = measurementMode
  }, [measurementMode])
  
  // Keep clippingModeRef in sync
  useEffect(() => {
    clippingModeRef.current = clippingMode
  }, [clippingMode])
  
  // If clipping feature flag is turned off externally, ensure cleanup
  useEffect(() => {
    if (!enableClipping) {
      setClippingMode(false)
      clippingModeRef.current = false
      activeClipPlaneRef.current = null
      setActiveClipPlane(null)
      clipAmountRef.current = 0
      setClipAmount(0)
      disableClippingPlane()
    }
  }, [enableClipping])
  
  // Selection refs
  const handleSelectionFromMeshRef = useRef<((mesh: THREE.Mesh) => Promise<void>) | null>(null) // Store selection handler
  const clearSelectionRef = useRef<(() => void) | null>(null) // Store clearSelection function
  const [selectedElement, setSelectedElement] = useState<{ expressID: number; type: string } | null>(null)
  const [selectionMode, setSelectionMode] = useState<'parts' | 'assemblies'>('parts')
  const selectionModeRef = useRef<'parts' | 'assemblies'>('parts')
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Track element states: 'normal' | 'transparent' | 'hidden'
  const elementStatesRef = useRef<Map<THREE.Mesh, 'normal' | 'transparent' | 'hidden'>>(new Map())
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map())
  const originalVisibilityRef = useRef<Map<THREE.Mesh, boolean>>(new Map())

  // Keep ref in sync with state
  useEffect(() => {
    selectionModeRef.current = selectionMode
  }, [selectionMode])
  const [isLoading, setIsLoading] = useState(false)
  const [conversionStatus, setConversionStatus] = useState<string>('')
  const isLoadingRef = useRef<boolean>(false) // Guard to prevent multiple simultaneous loads
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    element: THREE.Mesh | null
    productId: number | null
    assemblyId: number | null  // For assembly mode
  }>({
    visible: false,
    x: 0,
    y: 0,
    element: null,
    productId: null,
    assemblyId: null
  })
  
  // Element data for context menu
  const [elementData, setElementData] = useState<{
    loading: boolean
    data: {
      product_id: number
      element_type: string
      basic_attributes: Record<string, any>
      property_sets: Record<string, Record<string, any>>
      materials: Array<any>
      relationships: Record<string, any>
      profile_info: Record<string, any>
      geometry_info: Record<string, any>
    } | null
    error: string | null
  }>({
    loading: false,
    data: null,
    error: null
  })

  useEffect(() => {
    if (!containerRef.current || !filename) {
      setLoadError(null)
      setIsLoading(false)
      return
    }

    // Check if component should initialize based on isVisible prop
    // Don't check clientWidth - CSS hidden class makes it 0 even when tab is active
    if (!isVisible && !sceneRef.current) {
      // Don't initialize if hidden AND not yet initialized
      console.log('[IFCViewer] Component hidden (isVisible=false), deferring initialization until visible')
      setLoadError(null)
      setIsLoading(false)
      return
    }
    
    // If already initialized but hidden, that's fine - keep the scene alive
    if (!isVisible && sceneRef.current) {
      console.log('[IFCViewer] Component hidden but scene exists, keeping alive')
      return
    }

    console.log('[IFCViewer] Initializing Three.js scene')
    console.log('[IFCViewer] Container dimensions:', containerRef.current.clientWidth, 'x', containerRef.current.clientHeight)

    // Create scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.01,  // Near plane - small but not extreme to prevent clipping issues (0.01-0.1 range)
      10000  // Increased far plane for large models
    )
    camera.updateProjectionMatrix()
    // Initial camera position (will be adjusted when model loads)
    camera.position.set(10, 10, 10)
    camera.up.set(0, 1, 0)  // Ensure Y-up coordinate system
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Create renderer with preserveDrawingBuffer enabled for screenshots
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true // Required for screenshot capture
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setClearColor(0xf0f0f0)
    console.log('[IFCViewer] Renderer created and sized to:', containerRef.current.clientWidth, 'x', containerRef.current.clientHeight)
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2 // Slightly increased for better visibility
    // renderer.physicallyCorrectLights = true // Not available in this Three.js version
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Add lights - important for materials to show correctly
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x666666, 0.5)
    scene.add(hemiLight)
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.6)
    directionalLight1.position.set(12, 14, 10)
    directionalLight1.castShadow = true
    directionalLight1.shadow.mapSize.set(2048, 2048)
    directionalLight1.shadow.bias = -0.0005
    directionalLight1.shadow.camera.near = 0.1
    directionalLight1.shadow.camera.far = 1000
    directionalLight1.shadow.camera.left = -100
    directionalLight1.shadow.camera.right = 100
    directionalLight1.shadow.camera.top = 100
    directionalLight1.shadow.camera.bottom = -100
    scene.add(directionalLight1)
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.9)
    directionalLight2.position.set(-10, -12, -8)
    directionalLight2.castShadow = true
    directionalLight2.shadow.mapSize.set(1024, 1024)
    directionalLight2.shadow.bias = -0.0005
    directionalLight2.shadow.camera.near = 0.1
    directionalLight2.shadow.camera.far = 1000
    directionalLight2.shadow.camera.left = -100
    directionalLight2.shadow.camera.right = 100
    directionalLight2.shadow.camera.top = 100
    directionalLight2.shadow.camera.bottom = -100
    scene.add(directionalLight2)

    // Setup controls for instant, responsive camera movement
    const controls = new OrbitControls(camera, renderer.domElement)
    
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
    
    // Enable pan for middle mouse button
    controls.enablePan = true
    
    // Touch controls for mobile
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    }
    
    // Keyboard controls (optional, for arrow keys)
    controls.keys = {
      LEFT: 'ArrowLeft',
      UP: 'ArrowUp',
      RIGHT: 'ArrowRight',
      BOTTOM: 'ArrowDown'
    }
    
    // Disable auto-rotate
    controls.autoRotate = false
    
    // Make sure up vector is correct (Y-up is standard)
    controls.target.set(0, 0, 0)
    
    // Helper function to raycast and find mesh
    // Helper function to raycast and find mesh (currently unused)
    // @ts-ignore - intentionally unused, kept for potential future use
    const _raycastForMeshAtPosition = (clientX: number, clientY: number): { intersection: THREE.Intersection | null, mesh: THREE.Mesh | null } => {
      if (!containerRef.current || !camera || !modelRef.current) {
        return { intersection: null, mesh: null }
      }
      
      // Compute NDC from canvas bounding rect
      const rect = containerRef.current.getBoundingClientRect()
      const clickX = clientX - rect.left
      const clickY = clientY - rect.top
      
      // Verify click is within the container bounds
      if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
        return { intersection: null, mesh: null }
      }
      
      const mouseX = (clickX / rect.width) * 2 - 1
      const mouseY = -((clickY / rect.height) * 2 - 1)
      
      // Raycast against model group meshes only (ignore helpers)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)
      const intersections = raycaster.intersectObjects(modelRef.current.children, true)
      
      // Filter out edge lines and find best mesh intersection
      let bestIntersection = null
      let bestMesh = null
      
      for (const intersection of intersections) {
        const obj = intersection.object as any
        // Skip edge lines completely
        if (obj.isLine || obj.isLineSegments || (obj.name && obj.name.includes('_edges'))) {
          continue
        }
        // Use the first valid visible mesh intersection
        if (obj.isMesh && obj.visible && intersection.distance > 0 && intersection.distance < camera.far) {
          bestIntersection = intersection
          bestMesh = obj as THREE.Mesh
          break
        }
      }
      
      // If no mesh found, try to get parent mesh from edge lines
      if (!bestMesh) {
        for (const intersection of intersections) {
          const obj = intersection.object as any
          if (obj.isLine || obj.isLineSegments || (obj.name && obj.name.includes('_edges'))) {
            // Try to find parent mesh
            let parent = obj.parent
            let depth = 0
            while (parent && depth < 5) {
              if (parent.isMesh && (parent as THREE.Mesh).visible) {
                const parentMesh = parent as THREE.Mesh
                if (intersection.distance > 0 && intersection.distance < camera.far) {
                  bestIntersection = intersection
                  bestMesh = parentMesh
                  break
                }
              }
              parent = parent.parent
              depth++
            }
            if (bestMesh) break
          }
        }
      }
      
      return { intersection: bestIntersection, mesh: bestMesh }
    }
    
    // 2) On pointerdown on the canvas
    const onPointerDown = (event: PointerEvent) => {
      // Only handle left button for orbit/selection
      // Right-click (button === 2) is reserved for context menu only
      if (event.button !== 0) return
      
      // Set pointer down state
      isPointerDownRef.current = true
      dragStartedRef.current = false
      downPosRef.current = { x: event.clientX, y: event.clientY }
      
      // Shift + Left: panning (handled by OrbitControls)
      if (event.shiftKey) {
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN
        return
      }
      
      // Left-click: orbit
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
      
      // Calculate pivot point at cursor position for orbiting around clicked point (for left-click + drag)
      if (containerRef.current && camera && controls) {
        const rect = containerRef.current.getBoundingClientRect()
        const clickX = event.clientX - rect.left
        const clickY = event.clientY - rect.top
        
        // Verify click is within the container bounds
        if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
          const mouseX = (clickX / rect.width) * 2 - 1
          const mouseY = -((clickY / rect.height) * 2 - 1)
          
          const raycaster = new THREE.Raycaster()
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)
          
          // First, try to find geometry intersection for more accurate pivot
          let pivotPoint: THREE.Vector3 | null = null
          
          if (modelRef.current) {
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
          
          if (validIntersections.length > 0) {
              pivotPoint = validIntersections[0].point.clone()
            }
          }
          
          // If no geometry hit, create pivot point at cursor depth using a plane
          if (!pivotPoint) {
            const currentDistance = camera.position.distanceTo(controls.target)
            const planeNormal = camera.getWorldDirection(new THREE.Vector3())
            const planePoint = controls.target.clone()
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint)
            
            const intersectionPoint = new THREE.Vector3()
            const hasIntersection = raycaster.ray.intersectPlane(plane, intersectionPoint)
            
            if (hasIntersection) {
              pivotPoint = intersectionPoint.clone()
      } else {
              // Fallback: use a point along the ray at a reasonable distance
              pivotPoint = raycaster.ray.at(currentDistance * 0.8, new THREE.Vector3())
            }
          }
          
          // Store pivot point for immediate use (no animation, just set it)
          pendingPivotRef.current = pivotPoint
        }
      }
      
      // DO NOT select here
    }
    
    // 3) On pointermove
    const onPointerMove = (event: PointerEvent) => {
      // If measurement mode is active, check for geometry hover
      if (enableMeasurement && measurementModeRef.current && !isPointerDownRef.current) {
        if (containerRef.current && camera && modelRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const mouseX = event.clientX - rect.left
          const mouseY = event.clientY - rect.top
          
          // Verify mouse is within the container bounds
          if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
            const normalizedX = (mouseX / rect.width) * 2 - 1
            const normalizedY = -((mouseY / rect.height) * 2 - 1)
            
            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera)
            
            // Check for geometry intersection
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
            
            if (validIntersections.length > 0) {
              const intersection = validIntersections[0]
              
              // Check for corner snapping first (corners take priority)
              // Only snap when cursor is very close to a corner (1cm) - don't auto-find closest
              const cornerSnapDistance = 0.01 // 1cm snap distance for corners - only when very close
              let snappedPoint = findClosestCorner(intersection, modelRef.current, cornerSnapDistance)
              
              // If not near a corner, check for edge snapping
              if (!snappedPoint) {
                const edgeSnapDistance = 0.1 // 10cm snap distance for edges
                snappedPoint = findClosestEdgePoint(intersection, modelRef.current, edgeSnapDistance)
              }
              
              // Only show square cursor when near a corner or edge
              if (snappedPoint) {
                const snappedHitPoint = snappedPoint
                
                // Calculate square size for fixed 30x30 pixels on screen
                // Convert pixel size to world size based on distance and camera FOV
                const distanceToCamera = camera.position.distanceTo(snappedHitPoint)
                const fov = camera.fov * (Math.PI / 180) // Convert to radians
                const height = 2 * Math.tan(fov / 2) * distanceToCamera // World height at distance
                const pixelToWorld = height / (containerRef.current?.clientHeight || 1)
                const squareSizeWorld = 30 * pixelToWorld // 30 pixels in world units
                
                // Update hover preview marker - square icon with red border only
                if (!hoverPreviewMarkerRef.current) {
                  // Create a canvas for the square icon
                  const canvas = document.createElement('canvas')
                  canvas.width = 30
                  canvas.height = 30
                  const ctx = canvas.getContext('2d')
                  if (ctx) {
                    // Draw a red square border
                    ctx.strokeStyle = '#ff0000'
                    ctx.lineWidth = 2
                    ctx.strokeRect(1, 1, 28, 28) // 2px border, 28px inner square
                  }
                  
                  // Create a sprite from the canvas
                  const texture = new THREE.CanvasTexture(canvas)
                  const spriteMaterial = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.1
                  })
                  const sprite = new THREE.Sprite(spriteMaterial)
                  sprite.name = 'measurement-hover-preview'
                  scene.add(sprite)
                  hoverPreviewMarkerRef.current = sprite
                }
                
                // Scale the sprite to be exactly 30x30 pixels on screen
                if (hoverPreviewMarkerRef.current) {
                  hoverPreviewMarkerRef.current.scale.set(squareSizeWorld, squareSizeWorld, 1)
                  
                  // Position the marker at the snapped corner/edge point
                  hoverPreviewMarkerRef.current.position.copy(snappedHitPoint)
                  
                  // Sprite automatically faces camera, so no rotation needed
                  
                  hoverPreviewMarkerRef.current.visible = true
                }
                
                // Change cursor style - hide default cursor, square icon acts as cursor
                if (containerRef.current) {
                  containerRef.current.style.cursor = 'none'
                }
                
                // Update preview arrow if we have a start point
                if (measurementPointsRef.current.length === 1) {
                  const startPoint = measurementPointsRef.current[0]
                  updatePreviewArrow(startPoint, snappedHitPoint)
                }
              } else {
                // Not near a corner or edge - hide square and show default cursor
                if (hoverPreviewMarkerRef.current) {
                  hoverPreviewMarkerRef.current.visible = false
                }
                if (containerRef.current) {
                  containerRef.current.style.cursor = 'default'
                }
                
                // Still update preview arrow if we have a start point (use plane intersection)
                if (measurementPointsRef.current.length === 1) {
                  const startPoint = measurementPointsRef.current[0]
                  const currentDistance = camera.position.distanceTo(controls.target)
                  const planeNormal = camera.getWorldDirection(new THREE.Vector3())
                  const planePoint = controls.target.clone()
                  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint)
                  
                  const intersectionPoint = new THREE.Vector3()
                  const hasIntersection = raycaster.ray.intersectPlane(plane, intersectionPoint)
                  const currentPoint = hasIntersection ? intersectionPoint : raycaster.ray.at(currentDistance * 0.8, new THREE.Vector3())
                  updatePreviewArrow(startPoint, currentPoint)
                }
              }
            } else {
              // No geometry under cursor - hide square, user can only measure on element edges/corners
              if (hoverPreviewMarkerRef.current) {
                hoverPreviewMarkerRef.current.visible = false
              }
              
              // Hide preview arrow when not over geometry
              if (previewArrowRef.current) {
                previewArrowRef.current.visible = false
              }
              
              // Change cursor to default (measurement only works on edges/corners)
              if (containerRef.current) {
                containerRef.current.style.cursor = 'default'
              }
            }
          }
        }
      } else {
        // Not in measurement mode - hide preview and reset cursor
        if (hoverPreviewMarkerRef.current) {
          hoverPreviewMarkerRef.current.visible = false
        }
        if (containerRef.current && !isPointerDownRef.current) {
          containerRef.current.style.cursor = 'default'
        }
      }
      
      // If pointer is not down, return (for drag detection)
      if (!isPointerDownRef.current) return
      
      // Compute moved distance from downPos
      const deltaX = event.clientX - downPosRef.current.x
      const deltaY = event.clientY - downPosRef.current.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      // If distance > DRAG_THRESHOLD_PX and !dragStartedRef.current:
      if (distance > DRAG_THRESHOLD_PX && !dragStartedRef.current) {
        dragStartedRef.current = true
        
        // Set pivot point INSTANTLY without animation (no zoom effect)
        if (pendingPivotRef.current && camera && controls) {
          const pivotPoint = pendingPivotRef.current
          
          // Simply update the OrbitControls target to the new pivot point
          // No animation, no camera position change - just change rotation center
          controls.target.copy(pivotPoint)
          controls.update()
          
          // Clear the pending pivot
          pendingPivotRef.current = null
        }
      }
      
      // Do not do selection in pointermove
    }
    
    // 4) On pointerup
    const onPointerUp = async (event: PointerEvent) => {
      // Only handle left button for orbit/selection
      if (event.button !== 0) return
      
      // Reset pointer down state
      isPointerDownRef.current = false
      
      // If dragStartedRef.current is true: user was orbiting, not clicking
      if (dragStartedRef.current) {
        dragStartedRef.current = false
        pendingPivotRef.current = null
        // Reset animation state
        isAnimatingPivotRef.current = false
        oldTargetRef.current = null
        oldCameraPosRef.current = null
        targetPivotRef.current = null
        return // Do NOT run selection
      }
      
      // Clear pending pivot on click (no drag)
      pendingPivotRef.current = null
      // Reset animation state
      isAnimatingPivotRef.current = false
      oldTargetRef.current = null
      oldCameraPosRef.current = null
      targetPivotRef.current = null
      
      // MEASUREMENT MODE: Handle measurement clicks
      console.log('[MEASUREMENT] onPointerUp - enableMeasurement:', enableMeasurement, 'measurementMode:', measurementMode, 'measurementModeRef:', measurementModeRef.current)
      if (enableMeasurement && measurementModeRef.current) {
        console.log('[MEASUREMENT] Entering measurement mode handler')
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
        
        // Verify click is within the container bounds
        if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
          return
        }
        
        const mouseX = (clickX / rect.width) * 2 - 1
        const mouseY = -((clickY / rect.height) * 2 - 1)
        
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)
        
        // Always prioritize geometry intersections - require actual geometry hit
        let clickPoint: THREE.Vector3 | null = null
        let hitMesh: THREE.Mesh | null = null
        
        if (modelRef.current) {
          const pickables: THREE.Mesh[] = []
          modelRef.current.traverse((child: any) => {
            if (child.isMesh && child.visible) {
              // Only include actual geometry meshes, exclude lines and edges
              if (!child.isLine && !child.isLineSegments && !(child.name && child.name.includes('_edges'))) {
                pickables.push(child)
              }
            }
          })
          
          // Get all intersections sorted by distance
          const intersections = raycaster.intersectObjects(pickables, true)
          const validIntersections = intersections.filter(intersection => {
            const obj = intersection.object as any
            return obj.isMesh && obj.visible && intersection.distance > 0 && intersection.distance < camera.far
          })
          
          if (validIntersections.length > 0) {
            // Use the closest geometry intersection
            const closestHit = validIntersections[0]
            
            // Check for corner snapping first (corners take priority)
            // Only snap when cursor is very close to a corner (1cm) - don't auto-find closest
            const cornerSnapDistance = 0.01 // 1cm snap distance for corners - only when very close
            let snappedPoint = findClosestCorner(closestHit, modelRef.current, cornerSnapDistance)
            
            // If not near a corner, check for edge snapping
            if (!snappedPoint) {
              const edgeSnapDistance = 0.1 // 10cm snap distance for edges
              snappedPoint = findClosestEdgePoint(closestHit, modelRef.current, edgeSnapDistance)
            }
            
            // Only allow measurement if we're near a corner or edge
            // Don't allow measurement from the middle of surfaces
            if (snappedPoint) {
              clickPoint = snappedPoint.clone()
              hitMesh = closestHit.object as THREE.Mesh
              console.log('[MEASUREMENT] Snapped to corner/edge on click:', clickPoint)
            } else {
              // Not near a corner or edge - don't create measurement point
              console.log('[MEASUREMENT] Click ignored - not near corner or edge')
              return // Exit early, don't create measurement point
            }
            
            console.log('[MEASUREMENT] Geometry hit:', {
              point: clickPoint,
              mesh: hitMesh.name || 'unnamed',
              distance: closestHit.distance,
              snapped: !!snappedPoint
            })
          }
        }
        
        // Only allow measurement on element edges/corners - no plane intersection fallback
        if (!clickPoint) {
          console.log('[MEASUREMENT] Click ignored - measurement only works on element edges/corners')
          return // Exit early, don't create measurement point
        }
        
        if (clickPoint) {
          console.log('[MEASUREMENT] Click detected, current points:', measurementPointsRef.current.length)
          
          if (measurementPointsRef.current.length === 0) {
            // First point - create red dot
            measurementPointsRef.current = [clickPoint]
            createMeasurementDot(clickPoint)
            console.log('[MEASUREMENT] First point set:', clickPoint)
          } else if (measurementPointsRef.current.length === 1) {
            // Second point - create final measurement
            const startPoint = measurementPointsRef.current[0].clone()
            const endPoint = clickPoint.clone()
            measurementPointsRef.current.push(endPoint)
            createMeasurementDot(endPoint) // Red dot for second point
            createMeasurementArrow(startPoint, endPoint) // Final arrow
            console.log('[MEASUREMENT] Measurement created successfully')
          } else {
            // Reset and start new measurement
            clearMeasurement()
            measurementPointsRef.current = [clickPoint]
            createMeasurementDot(clickPoint) // Red dot for new first point
            console.log('[MEASUREMENT] Reset, first point set:', clickPoint)
          }
        } else {
          console.log('[MEASUREMENT] No click point found')
        }
        
        return // Don't run selection in measurement mode
      }
      
      // Else (no drag => it's a click): Run selection raycast
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
      
      // Verify click is within the container bounds
      if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
        return
      }
      
      const mouseX = (clickX / rect.width) * 2 - 1
      const mouseY = -((clickY / rect.height) * 2 - 1)
      
      // Raycast against model meshes only (filter out helpers, gizmos, invisible meshes)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)
      
      // Get all meshes from model group (pickables)
      const pickables: THREE.Mesh[] = []
      modelRef.current.traverse((child: any) => {
        if (child.isMesh && child.visible) {
          // Filter out helpers, gizmos, and edge lines
          if (!child.isLine && !child.isLineSegments && !(child.name && child.name.includes('_edges'))) {
            pickables.push(child)
          }
        }
      })
      
      const intersections = raycaster.intersectObjects(pickables, true)
      
      // Filter intersections to only visible meshes
      const validIntersections = intersections.filter(intersection => {
        const obj = intersection.object as any
        return obj.isMesh && obj.visible && intersection.distance > 0 && intersection.distance < camera.far
      })
      
      // If no intersections: clear selection
      if (validIntersections.length === 0) {
        if (clearSelectionRef.current) {
          clearSelectionRef.current()
        }
        setSelectedElement(null)
        console.log('[SELECTION] no hit - clearing selection')
        return
      }
      
      // Get first valid hit
      const hit = validIntersections[0]
      const hitObject = hit.object as THREE.Mesh
      
      // Determine hitProductId from hit.object.userData
      const hitProductId = hitObject.userData?.product_id || 
                          hitObject.userData?.expressID || 
                          hitObject.userData?.id ||
                          ((hitObject as any).metadata?.product_id)
      
      // Toggle/select logic (same object => clearSelection, different => select)
      if (selectedProductIdsRef.current.length === 1 && 
          selectedProductIdsRef.current[0] === hitProductId) {
        // Currently selected object clicked again - toggle off (deselect)
        if (clearSelectionRef.current) {
          clearSelectionRef.current()
        }
        setSelectedElement(null)
        console.log('[SELECTION] toggle off (same object)')
      } else {
        // Select the hit object
        // IMPORTANT: In this click path, do NOT set controls.target, do NOT move camera, do NOT "fit to view"
        if (handleSelectionFromMeshRef.current) {
          await handleSelectionFromMeshRef.current(hitObject)
        }
        console.log('[CLICK] selection')
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
      
      // Only show context menu if an element is already selected via left click
      // Check refs which are more reliable than state
      const hasMesh = selectedMeshRef.current !== null
      const hasProductIds = selectedProductIdsRef.current.length > 0
      const hasSelection = hasMesh || hasProductIds
      
      if (!hasSelection) {
        setContextMenu({ visible: false, x: 0, y: 0, element: null, productId: null, assemblyId: null })
        return
      }
      
      // Use selectedMeshRef if available (most reliable)
      let selectedMesh: THREE.Mesh | null = selectedMeshRef.current
      let selectedProductId: number | null = null
      
      if (selectedMesh) {
        // Get product ID from the selected mesh
        const rawProductId = selectedMesh.userData?.product_id || 
                           selectedMesh.userData?.expressID || 
                           selectedMesh.userData?.id ||
                           ((selectedMesh as any).metadata?.product_id) ||
                           null
        // Ensure it's a number
        selectedProductId = rawProductId !== null ? Number(rawProductId) : null
        if (selectedProductId !== null && isNaN(selectedProductId)) {
          selectedProductId = null
        }
      } else if (selectedProductIdsRef.current.length > 0) {
        // Find the mesh by product ID
        const rawId = selectedProductIdsRef.current[0]
        selectedProductId = rawId !== null ? Number(rawId) : null
        if (selectedProductId !== null && isNaN(selectedProductId)) {
          selectedProductId = null
        }
        
        if (modelRef.current) {
          modelRef.current.traverse((child: any) => {
            if (child.isMesh && !selectedMesh) {
              const productId = child.userData?.product_id || 
                              child.userData?.expressID || 
                              child.userData?.id ||
                              ((child as any).metadata?.product_id)
              if (productId === selectedProductId) {
                selectedMesh = child
              }
            }
          })
        }
      }
      
      if (selectedMesh && selectedProductId !== null) {
        // Get assembly_id if in assembly mode
        let assemblyId: number | null = null
        if (selectionModeRef.current === 'assemblies') {
          // Try to get assembly_id from the selected mesh
          assemblyId = selectedMesh.userData?.assembly_id || null
          
          // If not found in userData, try to get from assembly mapping
          if (!assemblyId && modelRef.current?.userData?.assemblyMapping) {
            const mapping = modelRef.current.userData.assemblyMapping
            const mappingEntry = mapping[selectedProductId]
            if (mappingEntry && mappingEntry.assembly_id) {
              assemblyId = mappingEntry.assembly_id
            }
          }
        }
        
        // Show context menu for the currently selected element
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
    
    // No custom wheel handler - use default OrbitControls zoom
    
    // Add pointer event listeners (single source of truth, pointer events only)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('contextmenu', handleContextMenu)
    
    // Ensure camera up vector stays correct on any control change
    const handleChange = () => {
      camera.up.set(0, 1, 0)
    }
    controls.addEventListener('change', handleChange)
    
    controlsRef.current = controls
    
    // Store cleanup functions for later
    const cleanupMouseHandlers = () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu)
      // No custom wheel handler to clean up - using default OrbitControls zoom
    }

    // Load glTF file
    const loadGLTF = async () => {
      if (!filename) {
        console.warn('No filename provided to IFCViewer')
        return
      }

      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) {
        console.log('[IFCViewer] Already loading, skipping duplicate loadGLTF call')
        return
      }

      console.log('[IFCViewer] Starting loadGLTF, filename:', filename, 'gltfPath:', gltfPath, 'gltfAvailable:', gltfAvailable)
      isLoadingRef.current = true
      setIsLoading(true)
      setLoadError(null)
      setConversionStatus('')

      try {
        // Determine glTF path - use gltfPath from upload response if available
        const gltfFilename = gltfPath || `/api/gltf/${filename.replace('.ifc', '.glb').replace('.IFC', '.glb')}`
        console.log('[IFCViewer] glTF filename to load:', gltfFilename)
        
        // Check if glTF file exists (skip check if we know it's available from upload)
        let gltfExists = gltfAvailable
        if (!gltfExists) {
          try {
            const headResponse = await fetch(gltfFilename, { method: 'HEAD' })
            gltfExists = headResponse.ok
          } catch (e) {
            // File doesn't exist, need to convert
          }
        }

        if (!gltfExists) {
          // Trigger conversion
          setConversionStatus('Converting IFC to glTF... This may take a moment.')
          
          const convertResponse = await fetch(`/api/convert-gltf/${filename}`, {
            method: 'POST'
          })
          
          if (!convertResponse.ok) {
            const errorData = await convertResponse.json().catch(() => ({ detail: 'Conversion failed' }))
            console.error('IFCViewer: Conversion request failed:', errorData)
            throw new Error(errorData.detail || 'Failed to start glTF conversion')
          }
          
          const convertData = await convertResponse.json()
          
          // If conversion was successful, the file should exist now
          if (convertData.gltf_path) {
            // Check if file exists
            const checkResponse = await fetch(convertData.gltf_path, { method: 'HEAD' })
            if (checkResponse.ok) {
              gltfExists = true
            }
          }
          
          // If still not exists, poll for conversion completion
          if (!gltfExists) {
            let attempts = 0
            const maxAttempts = 60 // 60 seconds max
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              const checkResponse = await fetch(gltfFilename, { method: 'HEAD' })
              if (checkResponse.ok) {
                gltfExists = true
                break
              }
              attempts++
              setConversionStatus(`Converting IFC to glTF... (${attempts}s)`)
            }
            
            if (!gltfExists) {
              console.error('IFCViewer: glTF conversion timed out after', maxAttempts, 'seconds')
              throw new Error('glTF conversion timed out. Please try again.')
            }
          }
        }

        setConversionStatus('Loading 3D model...')

        // Load the glTF file
        console.log('[IFCViewer] About to load glTF file:', gltfFilename)
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync(gltfFilename)
        console.log('[IFCViewer] glTF loaded successfully, scene:', gltf.scene)
        console.log('[IFCViewer] Scene has', gltf.scene.children.length, 'children')

        // Declare edge-related arrays at outer scope so they're accessible later
        const edgeLines: THREE.LineSegments[] = []
        const meshesToProcessForEdges: any[] = []  // Store meshes for async edge generation

        // Add model to scene
        if (gltf.scene) {
          // Update world matrix before calculating bounding box
          gltf.scene.updateMatrixWorld(true)
          
          // IFC files can use different coordinate systems
          // Try different rotations to match the original IFC orientation
          // Option 1: Z-up to Y-up (most common): rotate -90Â° around X
          // Option 2: No rotation (if already Y-up)
          // Option 3: Other transformations
          
          // For now, try Z-up to Y-up transformation
          // This rotates: (X, Y, Z) where Z is up -> (X, Z, -Y) where Y is up
          gltf.scene.rotation.x = -Math.PI / 2  // -90 degrees around X-axis
          
          scene.add(gltf.scene)
          modelRef.current = gltf.scene

          // Fit camera to model - position for ground-up view (Y-up coordinate system)
          // Calculate bounding box in world space
          const box = new THREE.Box3()
          box.setFromObject(gltf.scene)
          
          // Get center and size
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          console.log('[IFCViewer] Model bounding box - Center:', center, 'Size:', size)
          console.log('[IFCViewer] Model bounds - Min:', box.min, 'Max:', box.max)
          
          modelBoundsRef.current = {
            min: box.min.clone(),
            max: box.max.clone(),
            size: size.clone(),
            center: center.clone()
          }
          
          // Apply any additional per-mesh setup below
          const maxDim = Math.max(size.x, size.y, size.z)
          console.log('[IFCViewer] Max dimension:', maxDim)
          
          if (maxDim > 0) {
            // Calculate appropriate camera distance
            const fov = camera.fov * (Math.PI / 180)
            const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.8 // Add padding
            
            // Update shadow camera settings based on model size for better shadow coverage
            const shadowRange = maxDim * 2 // Shadow range should cover the entire model
            directionalLight1.shadow.camera.left = -shadowRange
            directionalLight1.shadow.camera.right = shadowRange
            directionalLight1.shadow.camera.top = shadowRange
            directionalLight1.shadow.camera.bottom = -shadowRange
            directionalLight1.shadow.camera.near = 0.1
            directionalLight1.shadow.camera.far = maxDim * 3
            directionalLight1.shadow.camera.updateProjectionMatrix()
            
            directionalLight2.shadow.camera.left = -shadowRange
            directionalLight2.shadow.camera.right = shadowRange
            directionalLight2.shadow.camera.top = shadowRange
            directionalLight2.shadow.camera.bottom = -shadowRange
            directionalLight2.shadow.camera.near = 0.1
            directionalLight2.shadow.camera.far = maxDim * 3
            directionalLight2.shadow.camera.updateProjectionMatrix()
            
            // Position camera for standard isometric view (ground-up perspective)
            // Standard isometric: 45Â° in XZ plane, ~35Â° elevation
            // This gives a good 3D view with Y as the vertical axis
            const isometricAngle = Math.PI / 4  // 45 degrees in horizontal plane
            const elevationAngle = Math.PI / 5   // ~36 degrees elevation (looking down slightly)
            
            const horizontalDist = distance * Math.cos(elevationAngle)
            const verticalDist = distance * Math.sin(elevationAngle)
            
            // Position camera: isometric view from above and to the side
            // X and Z are equal for isometric, Y is elevated
            const cameraPos = new THREE.Vector3(
              center.x + horizontalDist * Math.cos(isometricAngle),
              center.y + verticalDist,  // Elevated to see model from above
              center.z + horizontalDist * Math.sin(isometricAngle)
            )
            
            camera.position.copy(cameraPos)
            console.log('[IFCViewer] Camera positioned at:', cameraPos)
            
            // CRITICAL: Ensure Y is always up (ground-up coordinate system)
            camera.up.set(0, 1, 0)
            
            // Set controls target to model center
            controls.target.copy(center)
            console.log('[IFCViewer] Camera target set to:', center)
            
            // Make sure camera looks at center (this respects the up vector)
            camera.lookAt(center)
            
            // Force update the camera matrix to ensure up vector is respected
            camera.updateMatrixWorld()
            
            // Update controls to apply changes
            controls.update()
            
            // Force a render to show the correct view
            renderer.render(scene, camera)
          }

          // Simplified material processing - let Three.js handle default colors, only override fasteners

          gltf.scene.traverse((child: any) => {
            if (child.isMesh) {
              const material = Array.isArray(child.material) ? child.material[0] : child.material
              
              // Enable shadows
              child.castShadow = true
              child.receiveShadow = true

              // Extract and store assembly mark from metadata
              if (!child.userData) child.userData = {}
              
              // Try to get assembly mark from various sources
              if (child.userData.assembly_mark) {
                // Already stored
              } else if ((child as any).metadata?.assembly_mark) {
                child.userData.assembly_mark = (child as any).metadata.assembly_mark
                child.userData.product_id = (child as any).metadata.product_id
                child.userData.type = (child as any).metadata.element_type
              } else if (child.name) {
                // Try to parse from name (format: "elementType_productID_assemblyMark")
                const parts = child.name.split('_')
                if (parts.length >= 3) {
                  child.userData.assembly_mark = parts.slice(2).join('_')
                  child.userData.product_id = parseInt(parts[1]) || 0
                  child.userData.type = parts[0]
                }
              }
              
              // Also try to get from glTF extras if available
              if (!child.userData.assembly_mark && (child as any).userData?.extras) {
                const extras = (child as any).userData.extras
                if (extras.assembly_mark) {
                  child.userData.assembly_mark = extras.assembly_mark
                }
                if (extras.product_id) {
                  child.userData.product_id = extras.product_id
                }
                if (extras.element_type) {
                  child.userData.type = extras.element_type
                }
              }

              // Check if this is a fastener
              const matName = (material?.name || '').toString().toLowerCase()
              const nodeName = (child.name || '').toLowerCase()
              const isFastener =
                matName.includes('ifcfastener') ||
                matName.includes('ifcmechanicalfastener') ||
                matName.includes('fastener_detected') ||
                nodeName.includes('ifcfastener') ||
                nodeName.includes('ifcmechanicalfastener') ||
                (nodeName.includes('bolt') || nodeName.includes('nut') || nodeName.includes('washer') || 
                 nodeName.includes('fastener') || nodeName.includes('screw') || nodeName.includes('anchor'))

              if (isFastener) {
                // Remove vertex colors for fasteners
                if (child.geometry.hasAttribute('color')) {
                  child.geometry.deleteAttribute('color')
                }
                
                // Create new geometry without color attribute
                const originalGeom = child.geometry
                const newGeom = new THREE.BufferGeometry()
                
                if (originalGeom.hasAttribute('position')) {
                  newGeom.setAttribute('position', originalGeom.getAttribute('position').clone())
                }
                if (originalGeom.hasAttribute('normal')) {
                  newGeom.setAttribute('normal', originalGeom.getAttribute('normal').clone())
                }
                if (originalGeom.hasAttribute('uv')) {
                  newGeom.setAttribute('uv', originalGeom.getAttribute('uv').clone())
                }
                if (originalGeom.hasAttribute('uv2')) {
                  newGeom.setAttribute('uv2', originalGeom.getAttribute('uv2').clone())
                }
                if (originalGeom.index) {
                  newGeom.setIndex(originalGeom.index.clone())
                }
                
                child.geometry = newGeom
                originalGeom.dispose()
                
                // Apply dark brown-gold material for fasteners
                const darkBrownGoldColor = new THREE.Color(0x8B6914)
                const goldMaterial = new THREE.MeshStandardMaterial({
                  color: darkBrownGoldColor,
                  metalness: 0.3,
                  roughness: 0.6,
                  vertexColors: false
                })
                
                if (Array.isArray(child.material)) {
                  child.material.forEach((m: any) => {
                    if (m && typeof m.dispose === 'function') {
                      try { m.dispose() } catch (e) {}
                    }
                  })
                } else if (material && typeof material.dispose === 'function') {
                  try { material.dispose() } catch (e) {}
                }
                
                child.material = goldMaterial
                
                // Add edge lines for fasteners using darker gold color
                try {
                  const edgesGeometry = new THREE.EdgesGeometry(newGeom, 10)
                  // Make it darker by lerping with black (80% towards black = much darker)
                  const black = new THREE.Color(0x000000)
                  const darkerGoldColor = darkBrownGoldColor.clone().lerp(black, 0.8)
                  
                  const edgesMaterial = new THREE.LineBasicMaterial({ 
                    color: darkerGoldColor,
                    linewidth: 1.5,
                    opacity: 0.8,
                    transparent: true
                  })
                  const edgeLine = new THREE.LineSegments(edgesGeometry, edgesMaterial)
                  edgeLine.name = `${child.name || 'mesh'}_edges`
                  edgeLine.castShadow = false
                  edgeLine.receiveShadow = false
                  edgeLine.visible = true
                  
                  if (!child.userData) child.userData = {}
                  child.userData.edgeLine = edgeLine
                  edgeLines.push(edgeLine)
                  
                  child.add(edgeLine)
                } catch (e) {
                  // Ignore edge creation errors
                }
                
                return
              }

              // For non-fasteners, let Three.js handle colors from glTF
              // Only create default material if none exists
              if (!material) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x8888aa,
                  metalness: 0.3,
                  roughness: 0.7
                })
              }
              
              // Store mesh for async edge generation (don't generate edges synchronously)
              meshesToProcessForEdges.push(child)
            }
          })

          // Store edge lines reference in scene userData for toggling
          if (!gltf.scene.userData) gltf.scene.userData = {}
          gltf.scene.userData.edgeLines = edgeLines
          
          // Apply initial visibility - always show all elements
          updateVisibility(gltf.scene)

          // Load assembly mapping from API
          const loadAssemblyMapping = async () => {
            try {
              // Add timestamp to avoid caching
              const response = await fetch(`/api/assembly-mapping/${filename}?t=${Date.now()}`)
              if (response.ok) {
                const mapping = await response.json()
                // Debug: Check if plate_thickness is in the mapping
                const plateEntries = Object.entries(mapping).filter(([_id, entry]: [string, any]) => entry.element_type === 'IfcPlate')
                if (plateEntries.length > 0) {
                  const sampleEntry = plateEntries[0][1] as any
                  console.log('[ASSEMBLY_MAPPING] Sample plate entry from API:', sampleEntry)
                  console.log('[ASSEMBLY_MAPPING] Has plate_thickness:', 'plate_thickness' in sampleEntry)
                }
                // Store mapping in scene userData
                if (!gltf.scene.userData) gltf.scene.userData = {}
                gltf.scene.userData.assemblyMapping = mapping
                
                // Apply mapping to all meshes - try multiple ways to find product_id
                let appliedCount = 0
                gltf.scene.traverse((child: any) => {
                  if (child.isMesh) {
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
                    } else if (child.name) {
                      // Try to parse from name (format might be "elementType_productID" or "elementType_productID_assemblyMark")
                      const parts = child.name.split('_')
                      if (parts.length >= 2) {
                        const parsed = parseInt(parts[1])
                        if (!isNaN(parsed)) productId = parsed
                      }
                    }
                    
                    // CRITICAL: Always set product_id if we found it, even if not in mapping
                    // This ensures selection and filtering work correctly
                    if (productId) {
                      child.userData.product_id = productId
                      
                      // If this product is in the mapping, apply the mapping data
                      if (mapping[productId]) {
                        child.userData.assembly_mark = mapping[productId].assembly_mark
                        child.userData.assembly_id = mapping[productId].assembly_id || null
                        child.userData.type = mapping[productId].element_type
                        
                        // Store plate thickness if available (even if it's "N/A")
                        // Check if plate_thickness exists in the mapping entry
                        if ('plate_thickness' in mapping[productId]) {
                          child.userData.plate_thickness = mapping[productId].plate_thickness
                        } else if (mapping[productId].element_type === 'IfcPlate') {
                          // If it's a plate but plate_thickness is missing, log it and default to "N/A"
                          console.warn(`[ASSEMBLY_MAPPING] Plate ${productId} missing plate_thickness in mapping`)
                          child.userData.plate_thickness = "N/A"
                        }
                        
                        // Store profile_name if available (for beams, columns, members)
                        const elementType = mapping[productId].element_type
                        if (elementType === 'IfcBeam' || elementType === 'IfcColumn' || elementType === 'IfcMember') {
                          if ('profile_name' in mapping[productId]) {
                            child.userData.profile_name = mapping[productId].profile_name
                          } else {
                            // If it's a profile element but profile_name is missing, log it and default to "N/A"
                            console.warn(`[ASSEMBLY_MAPPING] Profile element ${productId} (${elementType}) missing profile_name in mapping`)
                            child.userData.profile_name = "N/A"
                          }
                        }
                        
                        appliedCount++
                      } else {
                        // Product not in mapping - still set basic info from mesh name/metadata
                        // This ensures selection still works even if mapping is incomplete
                        if (!child.userData.type && child.name) {
                          const parts = child.name.split('_')
                          if (parts.length >= 1 && parts[0]) {
                            child.userData.type = parts[0]
                          }
                        }
                        
                        // Set profile_name for profile elements even if not in mapping
                        const elementType = child.userData.type || (child.name ? child.name.split('_')[0] : null)
                        if (elementType === 'IfcBeam' || elementType === 'IfcColumn' || elementType === 'IfcMember') {
                          if (!child.userData.profile_name) {
                            child.userData.profile_name = "N/A"
                          }
                        }
                        
                        // Set plate_thickness for plates even if not in mapping
                        if (elementType === 'IfcPlate') {
                          if (!child.userData.plate_thickness) {
                            child.userData.plate_thickness = "N/A"
                          }
                        }
                        
                        // Try to extract assembly_mark from mesh name if available (format: "elementType_productID_assemblyMark")
                        if (!child.userData.assembly_mark && child.name) {
                          const parts = child.name.split('_')
                          if (parts.length >= 3) {
                            // Assembly mark might contain underscores, so join everything after the first two parts
                            child.userData.assembly_mark = parts.slice(2).join('_')
                          }
                        }
                      }
                    } else {
                      // No product_id found - try to set type from name as fallback
                      if (!child.userData.type && child.name) {
                        const parts = child.name.split('_')
                        if (parts.length >= 1 && parts[0]) {
                          child.userData.type = parts[0]
                        }
                      }
                      
                      // Still set profile_name and plate_thickness based on element type, even without product_id
                      const elementType = child.userData.type || (child.name ? child.name.split('_')[0] : null)
                      if (elementType === 'IfcBeam' || elementType === 'IfcColumn' || elementType === 'IfcMember') {
                        if (!child.userData.profile_name) {
                          child.userData.profile_name = "N/A"
                        }
                      }
                      if (elementType === 'IfcPlate') {
                        if (!child.userData.plate_thickness) {
                          child.userData.plate_thickness = "N/A"
                        }
                      }
                    }
                  }
                })
                
                console.log(`Loaded assembly mapping for ${Object.keys(mapping).length} products, applied to ${appliedCount} meshes`)
              }
            } catch (error) {
              console.warn('Failed to load assembly mapping:', error)
            }
          }
          
          await loadAssemblyMapping()
          
          // Setup click selection
          setupClickSelectionWrapper(gltf.scene, setSelectedElement)
        }

        console.log('[IFCViewer] Model loaded and displayed successfully')
        setIsLoading(false)
        setConversionStatus('')
        isLoadingRef.current = false
        console.log('[IFCViewer] Loading state cleared, overlay should be hidden')
        console.log('[IFCViewer] Edge generation disabled for instant display - model ready!')
        
        // PERFORMANCE OPTIMIZATION: Edge generation disabled for instant model display
        // The model looks great with type-based colors and materials without edge lines
        // This saves 2-5 seconds of processing time for models with 2000+ meshes
        // 
        // To re-enable edges, uncomment the code below:
        /*
        if (meshesToProcessForEdges.length > 0) {
          setTimeout(() => {
            console.log('[IFCViewer] Starting asynchronous edge generation for', meshesToProcessForEdges.length, 'meshes')
            let processedCount = 0
            const CHUNK_SIZE = 50  // Process 50 meshes at a time to avoid blocking
            
            const processChunk = () => {
              const endIndex = Math.min(processedCount + CHUNK_SIZE, meshesToProcessForEdges.length)
              
              for (let i = processedCount; i < endIndex; i++) {
                const child = meshesToProcessForEdges[i]
                try {
                  const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 10)
                  const currentMaterial = Array.isArray(child.material) ? child.material[0] : child.material
                  const elementColor = currentMaterial?.color || new THREE.Color(0x8888aa)
                  const black = new THREE.Color(0x000000)
                  const darkerColor = elementColor.clone().lerp(black, 0.8)
                  
                  const edgesMaterial = new THREE.LineBasicMaterial({ 
                    color: darkerColor,
                    linewidth: 1.5,
                    opacity: 0.8,
                    transparent: true
                  })
                  const edgeLine = new THREE.LineSegments(edgesGeometry, edgesMaterial)
                  edgeLine.name = `${child.name || 'mesh'}_edges`
                  edgeLine.castShadow = false
                  edgeLine.receiveShadow = false
                  edgeLine.visible = true
                  
                  if (!child.userData) child.userData = {}
                  child.userData.edgeLine = edgeLine
                  edgeLines.push(edgeLine)
                  child.add(edgeLine)
                } catch (e) {
                  // Ignore edge creation errors
                }
              }
              
              processedCount = endIndex
              
              if (processedCount < meshesToProcessForEdges.length) {
                // Process next chunk on next animation frame
                requestAnimationFrame(processChunk)
              } else {
                console.log('[IFCViewer] Edge generation complete for all', processedCount, 'meshes')
              }
            }
            
            // Start processing after a small delay to let the model render first
            requestAnimationFrame(processChunk)
          }, 100)
        }
        */
      } catch (error) {
        console.error('[IFCViewer] Error loading glTF:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setLoadError(`Failed to load 3D model: ${errorMessage}`)
        setIsLoading(false)
        setConversionStatus('')
        isLoadingRef.current = false
      }
    }

    loadGLTF()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // Animation loop
    let animationId: number
    let frameCount = 0
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      frameCount++
      
      // Log first few frames to verify animation is running
      if (frameCount <= 3) {
        console.log('[IFCViewer] Animation frame', frameCount, '- Scene children:', scene.children.length, 'Model:', modelRef.current ? 'loaded' : 'null')
      }
      
      // Animate pivot transition smoothly (runs every frame for smooth animation)
      if (isAnimatingPivotRef.current && oldTargetRef.current && oldCameraPosRef.current && targetPivotRef.current && camera && controls) {
        const elapsed = performance.now() - animationStartTimeRef.current
        const duration = 150 // 150ms smooth transition
        const progress = Math.min(elapsed / duration, 1.0)
        
        // Use easing function for smooth transition (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3)
        
        // Calculate the offset from old target to new pivot
        const targetOffset = new THREE.Vector3().subVectors(targetPivotRef.current, oldTargetRef.current)
        
        // Interpolate target
        controls.target.copy(oldTargetRef.current).add(targetOffset.clone().multiplyScalar(eased))
        
        // Interpolate camera position - move by the SAME offset to maintain view
        camera.position.copy(oldCameraPosRef.current).add(targetOffset.clone().multiplyScalar(eased))
        
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
          isAnimatingPivotRef.current = false
          
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
        }
      }
      
      // Update measurement label positions (HTML overlay) for all measurements
      if (enableMeasurement) {
        // Update current in-progress measurement label
        if (measurementLabelDivRef.current) {
          const updateFn = (measurementLabelDivRef.current as any).updatePosition
          if (updateFn) updateFn()
        }
        
        // Update all stored measurement labels
        allMeasurementsRef.current.forEach(measurement => {
          if (measurement.label) {
            const updateFn = (measurement.label as any).updatePosition
            if (updateFn) updateFn()
          }
        })
      }
      
      // Normal update - the overridden update method will handle preservation
      controls.update()
      
      renderer.render(scene, camera)
    }
    animate()

          return () => {
            console.log('[IFCViewer] Component unmounting, cleaning up...')
            
            // CRITICAL: Reset loading guard so component can load on next mount
            isLoadingRef.current = false
            
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', handleResize)
            
            // Cleanup measurement
            if (enableMeasurement) {
              clearMeasurement()
            }
            
            // Cleanup clipping
            if (enableClipping) {
              disableClippingPlane()
            }
            
            
            // Remove custom rotation event listeners
            cleanupMouseHandlers()
            
            // Cleanup hover preview marker
            if (hoverPreviewMarkerRef.current && scene) {
              scene.remove(hoverPreviewMarkerRef.current)
              // Clean up sprite (sprites don't have geometry, but have material and texture)
              if (hoverPreviewMarkerRef.current?.material) {
                const material = hoverPreviewMarkerRef.current.material
                if (Array.isArray(material)) {
                  material.forEach((mat: THREE.Material) => {
                    const spriteMat = mat as THREE.SpriteMaterial
                    if (spriteMat.map) spriteMat.map.dispose()
                    mat.dispose()
                  })
                } else {
                  const spriteMat = material as THREE.SpriteMaterial
                  if (spriteMat.map) {
                    spriteMat.map.dispose()
                  }
                  material.dispose()
                }
              }
              hoverPreviewMarkerRef.current = null
            }
            
            // Reset cursor
            if (containerRef.current) {
              containerRef.current.style.cursor = 'default'
            }
            
            if (containerRef.current && renderer.domElement.parentNode) {
              renderer.domElement.parentNode.removeChild(renderer.domElement)
            }
            controls.dispose()
            renderer.dispose()
      
      // Clean up model
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current)
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
    }
  }, [filename, gltfPath, isVisible])

  const updateVisibility = (model: THREE.Object3D) => {
    if (!model) return

    // Always show all elements
    model.traverse((child: any) => {
      if (child.isMesh || child.isLine || child.isPoints) {
        child.visible = true
        
        // Always show edge lines
        if (child.userData && child.userData.edgeLine) {
          child.userData.edgeLine.visible = true
        }
      }
    })
    
    // Always show edge lines stored in scene userData
    if (model.userData && model.userData.edgeLines) {
      model.userData.edgeLines.forEach((edgeLine: THREE.LineSegments) => {
        edgeLine.visible = true
      })
    }
  }

  // Disable all clipping planes
  const disableClippingPlane = () => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    clippingHelperRef.current = disableClipping(renderer, scene, clippingHelperRef.current)
    clippingPlaneRef.current = null
  }

  // Apply a clipping plane based on selected side and normalized offset (0..1)
  const applyClippingPlane = (planeKey: ClipPlaneKey, amount: number) => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const model = modelRef.current
    if (!renderer || !scene || !model) return
    
    // Update model bounds
    const bounds = updateModelBounds(model)
    if (bounds) {
      modelBoundsRef.current = bounds
    }
    
    // Apply clipping
    const result = applyClipping(
      renderer,
      scene,
      model,
      planeKey,
      amount,
      clippingPlaneRef.current,
      clippingHelperRef.current
    )
    
    if (result) {
      clippingPlaneRef.current = result.plane
      clippingHelperRef.current = result.helper
    }
  }

  // Setup click selection using SelectionManager
  const setupClickSelectionWrapper = (
    model: THREE.Object3D,
    setSelected: (element: { expressID: number; type: string } | null) => void
  ) => {
    if (!cameraRef.current || !containerRef.current) return

    // Create refs object for SelectionManager
    const selectionRefs = {
      selectedMeshRef,
      selectedMeshesRef,
      selectedProductIdsRef,
      elementStatesRef,
      originalMaterialsRef,
      originalVisibilityRef,
      selectionModeRef
    }

    // Use the imported setupClickSelection from SelectionManager
    return setupClickSelection(
      model,
      setSelected,
      selectionRefs,
      filename,
      handleSelectionFromMeshRef,
      clearSelectionRef
    )
  }

  // All selection logic has been moved to SelectionManager
  // The setupClickSelectionWrapper function above now uses the imported setupClickSelection

  // Helper function to find meshes by product ID (wrapper for utility function)
  const findMeshesByProductIds = (productIds: number[]): THREE.Mesh[] => {
    if (!modelRef.current) {
      console.warn('[findMeshesByProductIds] No model available')
      return []
    }
    return findMeshesByProductIdsUtil(modelRef.current, productIds)
  }

  // Handler functions for control panel buttons (using visibility utilities)
  const handleTransparent = () => {
    handleTransparentUtil(
      modelRef.current,
      selectedProductIdsRef.current,
      selectedMeshesRef.current,
      {
        elementStatesRef,
        originalMaterialsRef,
        originalVisibilityRef
      }
    )
  }
  
  
  const handleHide = () => {
    handleHideUtil(
      modelRef.current,
      selectedProductIdsRef.current,
      selectedMeshesRef.current,
      {
        elementStatesRef,
        originalMaterialsRef,
        originalVisibilityRef
      }
    )
  }
  
  const handleHideAllExcept = () => {
    handleHideAllExceptUtil(
      modelRef.current,
      selectedProductIdsRef.current,
      selectedMeshesRef.current,
      {
        elementStatesRef,
        originalMaterialsRef,
        originalVisibilityRef
      }
    )
  }
  
  const handleShowAll = () => {
    handleShowAllUtil(
      modelRef.current,
      {
        elementStatesRef,
        originalMaterialsRef,
        originalVisibilityRef
      }
    )
    
    // Clear selection and remove highlighting (this is specific to IFCViewer, not part of the utility)
    selectedMeshesRef.current.forEach(mesh => {
      if (mesh.userData && mesh.userData._originalMaterial) {
        mesh.material = mesh.userData._originalMaterial
        delete mesh.userData._originalMaterial
      }
    })
    selectedMeshesRef.current = []
    selectedMeshRef.current = null
    selectedProductIdsRef.current = []
    setSelectedElement(null)
    
    console.log('[handleShowAll] Cleared all state maps and selection')
  }

  // Clear all measurements from the view
  const clearAllMeasurements = () => {
    const scene = sceneRef.current
    if (!scene) return
    
    // Remove all stored measurements
    allMeasurementsRef.current.forEach(measurement => {
      // Remove arrow
      if (measurement.arrow) {
        scene.remove(measurement.arrow)
        measurement.arrow.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: THREE.Material) => mat.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
      
      // Remove label
      if (measurement.label) {
        measurement.label.remove()
      }
      
      // Remove dots
      measurement.dots.forEach(dot => {
        scene.remove(dot)
        dot.geometry.dispose()
        if (dot.material) {
          if (Array.isArray(dot.material)) {
            dot.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            dot.material.dispose()
          }
        }
      })
    })
    
    // Clear the array
    allMeasurementsRef.current = []
    
    console.log('[MEASUREMENT] All measurements cleared')
  }
  
  // Clear current measurement visualization (for in-progress measurements)
  const clearMeasurement = () => {
    const scene = sceneRef.current
    if (!scene) return
    
    // Remove measurement arrow
    if (measurementLineRef.current) {
      scene.remove(measurementLineRef.current)
      // ArrowHelper has children, dispose them
      measurementLineRef.current.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      measurementLineRef.current = null
    }
    
    // Remove measurement label (HTML overlay)
    if (measurementLabelDivRef.current) {
      measurementLabelDivRef.current.remove()
      measurementLabelDivRef.current = null
    }
    
    // Clean up legacy sprite label if it exists
    if (measurementLabelRef.current && scene) {
      scene.remove(measurementLabelRef.current)
      measurementLabelRef.current.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      measurementLabelRef.current = null
    }
    
    measurementPointsRef.current = []
    
    // Remove measurement dots
    if (scene) {
      measurementDotsRef.current.forEach(dot => {
        scene.remove(dot)
        dot.geometry.dispose()
        if (dot.material) {
          if (Array.isArray(dot.material)) {
            dot.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            dot.material.dispose()
          }
        }
      })
      measurementDotsRef.current = []
    }
    
    // Remove preview arrow
    if (previewArrowRef.current && scene) {
      scene.remove(previewArrowRef.current)
      previewArrowRef.current.traverse((child: THREE.Object3D) => {
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
      previewArrowRef.current = null
    }
    
    // Hide hover preview marker
    if (hoverPreviewMarkerRef.current) {
      hoverPreviewMarkerRef.current.visible = false
    }
  }
  
  // Find closest corner/vertex for snapping
  // Note: findClosestCorner and findClosestEdgePoint are now imported from utils

  // Create a red dot at a point
  const createMeasurementDot = (point: THREE.Vector3) => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!scene || !camera) return null
    
    const dotSize = calculateDotSize(point, camera, containerRef.current?.clientHeight || 1, 8)
    const dot = createMeasurementDotUtil(point, dotSize, 0xff0000)
    
    scene.add(dot)
    measurementDotsRef.current.push(dot)
    
    return dot
  }
  
  // Create an arrow from start to end point (currently unused)
  // @ts-ignore - intentionally unused, kept for potential future use
  const _createArrow = (start: THREE.Vector3, end: THREE.Vector3) => {
    const scene = sceneRef.current
    if (!scene) return null
    
    const direction = new THREE.Vector3().subVectors(end, start)
    const length = direction.length()
    const arrowDirection = direction.clone().normalize()
    
    // Create arrow helper
    const arrowHelper = new THREE.ArrowHelper(
      arrowDirection,
      start,
      length,
      0xff0000, // Red color
      length * 0.1, // Head length (10% of total)
      length * 0.05 // Head width (5% of total)
    )
    
    arrowHelper.name = 'measurement-arrow'
    scene.add(arrowHelper)
    
    return arrowHelper
  }
  
  // Update preview arrow from start point to current cursor position
  const updatePreviewArrow = (startPoint: THREE.Vector3, endPoint: THREE.Vector3) => {
    const scene = sceneRef.current
    if (!scene) return
    
    // Remove existing preview arrow
    if (previewArrowRef.current) {
      scene.remove(previewArrowRef.current)
      previewArrowRef.current.traverse((child: THREE.Object3D) => {
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
      previewArrowRef.current = null
    }
    
    // Create new preview arrow
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint)
    const length = direction.length()
    if (length > 0.001) { // Only create if there's meaningful distance
      const arrowDirection = direction.clone().normalize()
      
      const arrowHelper = new THREE.ArrowHelper(
        arrowDirection,
        startPoint,
        length,
        0xff0000, // Red color
        length * 0.1, // Head length
        length * 0.05 // Head width
      )
      
      arrowHelper.name = 'measurement-preview-arrow'
      scene.add(arrowHelper)
      previewArrowRef.current = arrowHelper
    }
  }

  // Create final measurement arrow between two points
  const createMeasurementArrow = (start: THREE.Vector3, end: THREE.Vector3) => {
    const scene = sceneRef.current
    if (!scene) {
      console.log('[MEASUREMENT] createMeasurementArrow: No scene')
      return
    }
    
    console.log('[MEASUREMENT] createMeasurementArrow called with:', start, end)
    
    // Remove preview arrow
    if (previewArrowRef.current) {
      scene.remove(previewArrowRef.current)
      previewArrowRef.current.traverse((child: THREE.Object3D) => {
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
      previewArrowRef.current = null
    }
    
    // Clear existing measurement arrow
    if (measurementLineRef.current) {
      scene.remove(measurementLineRef.current)
      measurementLineRef.current.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      measurementLineRef.current = null
    }
    
    if (measurementLabelRef.current) {
      scene.remove(measurementLabelRef.current)
      measurementLabelRef.current.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      measurementLabelRef.current = null
    }
    
    // Create final arrow
    const direction = new THREE.Vector3().subVectors(end, start)
    const length = direction.length()
    const arrowDirection = direction.clone().normalize()
    
    const arrowHelper = new THREE.ArrowHelper(
      arrowDirection,
      start,
      length,
      0xff0000, // Red color
      length * 0.1, // Head length (10% of total)
      length * 0.05 // Head width (5% of total)
    )
    
    arrowHelper.name = 'measurement-arrow'
    scene.add(arrowHelper)
    console.log('[MEASUREMENT] Arrow added to scene')
    
    // Calculate distance in mm
    const distance = start.distanceTo(end) * 1000 // Convert from meters to mm
    console.log('[MEASUREMENT] Distance calculated:', distance, 'mm')
    
    // Create label at midpoint
    createMeasurementLabel(start, end, distance)
    
    // Store this measurement in the all measurements array
    const measurement = {
      arrow: arrowHelper,
      label: measurementLabelDivRef.current,
      dots: [...measurementDotsRef.current], // Copy the dots array
      start: start.clone(),
      end: end.clone()
    }
    allMeasurementsRef.current.push(measurement)
    
    // Clear current measurement refs (but keep the visuals in allMeasurementsRef)
    measurementLineRef.current = null
    measurementLabelDivRef.current = null
    measurementDotsRef.current = []
    measurementPointsRef.current = []
  }

  // Create text label showing distance using HTML overlay
  const createMeasurementLabel = (start: THREE.Vector3, end: THREE.Vector3, distance: number) => {
    const camera = cameraRef.current
    const container = containerRef.current
    if (!camera || !container) return
    
    // Calculate midpoint
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    
    // Format distance - show in mm, or m if > 1000mm
    const distanceInMm = distance
    let displayText: string
    if (distanceInMm >= 1000) {
      displayText = `${(distanceInMm / 1000).toFixed(2)} m`
    } else {
      displayText = `${distanceInMm.toFixed(0)} mm`
    }
    
    // Remove existing label if any
    if (measurementLabelDivRef.current) {
      measurementLabelDivRef.current.remove()
      measurementLabelDivRef.current = null
    }
    
    // Create HTML div for label
    const labelDiv = document.createElement('div')
    labelDiv.textContent = displayText
    labelDiv.style.position = 'absolute'
    labelDiv.style.pointerEvents = 'none'
    labelDiv.style.userSelect = 'none'
    labelDiv.style.color = '#ffffff'
    labelDiv.style.fontSize = '16px'
    labelDiv.style.fontWeight = 'bold'
    labelDiv.style.fontFamily = 'Arial, sans-serif'
    labelDiv.style.background = 'rgba(0, 0, 0, 0.85)'
    labelDiv.style.border = '2px solid #ff0000'
    labelDiv.style.borderRadius = '8px'
    labelDiv.style.padding = '6px 12px'
    labelDiv.style.whiteSpace = 'nowrap'
    labelDiv.style.zIndex = '1000'
    labelDiv.style.transform = 'translate(-50%, -50%)' // Center on point
    labelDiv.style.textAlign = 'center'
    
    container.appendChild(labelDiv)
    measurementLabelDivRef.current = labelDiv
    
    // Store midpoint on the label div so update function can access it
    const storedMidpoint = midpoint.clone()
    ;(labelDiv as any).midpoint = storedMidpoint
    
    // Update position function
    const updateLabelPosition = () => {
      if (!labelDiv || !camera || !container) return
      
      // Get stored midpoint
      const storedMidpoint = (labelDiv as any).midpoint as THREE.Vector3
      if (!storedMidpoint) return
      
      // Project 3D point to screen coordinates
      const vector = storedMidpoint.clone()
      vector.project(camera)
      
      const x = (vector.x * 0.5 + 0.5) * container.clientWidth
      const y = (-vector.y * 0.5 + 0.5) * container.clientHeight
      
      // Only show if point is in front of camera
      if (vector.z < 1) {
        labelDiv.style.left = `${x}px`
        labelDiv.style.top = `${y}px`
        labelDiv.style.display = 'block'
      } else {
        labelDiv.style.display = 'none'
      }
    }
    
    // Update position immediately
    updateLabelPosition()
    
    // Store update function for animate loop
    ;(labelDiv as any).updatePosition = updateLabelPosition
    
    console.log('[MEASUREMENT] HTML Label created:', displayText, 'at midpoint:', midpoint)
  }
  
  // --- Clipping controls ---
  const handleToggleClipping = () => {
    if (!enableClipping) return
    const newMode = !clippingModeRef.current
    clippingModeRef.current = newMode
    setClippingMode(newMode)
    
    if (!newMode) {
      // Turn off clipping entirely
      disableClippingPlane()
      setActiveClipPlane(null)
      activeClipPlaneRef.current = null
      setClipAmount(0)
      clipAmountRef.current = 0
      return
    }
    
    // Enable clipping and ensure renderer knows it
    if (activeClipPlaneRef.current) {
      applyClippingPlane(activeClipPlaneRef.current, clipAmountRef.current)
    } else {
      const defaultPlane: ClipPlaneKey = 'front'
      activeClipPlaneRef.current = defaultPlane
      setActiveClipPlane(defaultPlane)
      const defaultAmount = 0
      clipAmountRef.current = defaultAmount
      setClipAmount(defaultAmount)
      applyClippingPlane(defaultPlane, defaultAmount)
    }
  }
  
  const handleSelectClipPlane = (planeKey: ClipPlaneKey) => {
    if (!enableClipping) return
    activeClipPlaneRef.current = planeKey
    setActiveClipPlane(planeKey)
    applyClippingPlane(planeKey, clipAmountRef.current)
  }
  
  const handleClipSliderChange = (value: number) => {
    const normalized = Math.min(Math.max(value, 0), 1)
    setClipAmount(normalized)
    clipAmountRef.current = normalized
    if (clippingModeRef.current && activeClipPlaneRef.current) {
      applyClippingPlane(activeClipPlaneRef.current, normalized)
    }
  }
  
  // --- Markup/Screenshot functions ---
  const captureScreenshot = (): string | null => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    const container = containerRef.current
    const markupCanvas = markupCanvasRef.current
    
    if (!renderer || !scene || !camera || !container) {
      return null
    }
    
    return captureScreenshotUtil(
      renderer,
      scene,
      camera,
      container,
      markupCanvas,
      markupMode,
      markupElementsRef.current
    )
  }
  
  const handleSaveScreenshot = () => {
    const dataURL = captureScreenshot()
    if (!dataURL) {
      alert('Failed to capture screenshot')
      return
    }
    
    const success = saveScreenshotToFile(dataURL)
    if (success && markupMode) {
        clearAllMarkups()
    } else if (!success) {
      alert('Failed to save screenshot')
    }
  }
  
  const handleCopyScreenshot = async () => {
    const dataURL = captureScreenshot()
    if (!dataURL) {
      alert('Failed to capture screenshot')
      return
    }
    
    const success = await copyScreenshotToClipboard(dataURL)
    if (success) {
        alert('Screenshot copied to clipboard!')
        if (markupMode) {
          clearAllMarkups()
        }
      } else {
        alert('Clipboard API not supported in this browser. Please use the Save button instead.')
    }
  }
  
  const clearAllMarkups = () => {
    // Clear canvas
    const ctx = getCanvasContext()
    const canvas = markupCanvasRef.current
    if (ctx && canvas) {
      const dpr = window.devicePixelRatio || 1
      const displayWidth = canvas.width / dpr
      const displayHeight = canvas.height / dpr
      ctx.clearRect(0, 0, displayWidth, displayHeight)
    }
    
    // Clear stored markup elements
    markupElementsRef.current = []
    currentPencilPathRef.current = []
    lastPencilPointRef.current = null
    
    // Clear text elements
    const container = markupContainerRef.current
    if (container) {
      textElementsRef.current.forEach(textEl => {
        if (textEl.element && textEl.element.parentNode) {
          textEl.element.parentNode.removeChild(textEl.element)
        }
      })
      textElementsRef.current = []
    }
  }
  
  const handleToggleMarkup = () => {
    const newMode = !markupMode
    setMarkupMode(newMode)
    if (!newMode) {
      // Clear active tool and all markups when disabling markup
      setActiveMarkupTool(null)
      clearAllMarkups()
    } else {
      // Clear markups when re-enabling markup mode
      clearAllMarkups()
    }
  }
  
  // --- Markup Drawing Functions ---
  // Note: getColorHex, getLineWidth, and applyMarkupSettings are now imported from utils
  const applyMarkupSettings = (ctx: CanvasRenderingContext2D) => {
    applyMarkupSettingsUtil(ctx, markupColor, markupThickness)
  }
  
  const getCanvasContext = (): CanvasRenderingContext2D | null => {
    return getCanvasContextUtil(markupCanvasRef.current)
  }
  
  const setupMarkupCanvas = () => {
    const container = containerRef.current
    const canvas = markupCanvasRef.current
    if (!container || !canvas) return
    
    setupCanvasUtil(canvas, container, applyMarkupSettings)
  }
  
  const redrawMarkupCanvas = () => {
    const ctx = getCanvasContext()
    if (!ctx) return
    
    const canvas = markupCanvasRef.current
    if (!canvas) return
    
    // Get the actual canvas dimensions (accounting for devicePixelRatio)
    const dpr = window.devicePixelRatio || 1
    const displayWidth = canvas.width / dpr
    const displayHeight = canvas.height / dpr
    
    // Clear the entire canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight)
    
    // Redraw all saved markup elements
    markupElementsRef.current.forEach(element => {
      if (element.type === 'arrow' && element.data.start && element.data.end) {
        drawArrow(ctx, element.data.start, element.data.end, element.color, element.thickness)
      } else if (element.type === 'cloud' && element.data.start && element.data.end) {
        drawCloud(ctx, element.data.start, element.data.end, element.color, element.thickness)
      } else if (element.type === 'pencil' && element.path && element.path.length > 0) {
        // Redraw pencil path with smooth curves
        if (element.color && element.thickness !== undefined) {
          const colorHex = getColorHex(element.color as 'red' | 'black' | 'yellow' | 'green' | 'blue')
          const lineWidth = getLineWidth(element.thickness)
          ctx.strokeStyle = colorHex
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.miterLimit = 10
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
        }
        
        if (element.path.length === 1) {
          // Single point
          const p = element.path[0]
          ctx.beginPath()
          ctx.arc(p.x, p.y, getLineWidth(element.thickness || 3) / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Draw smooth curves using quadratic curves
          ctx.beginPath()
          ctx.moveTo(element.path[0].x, element.path[0].y)
          
          for (let i = 1; i < element.path.length; i++) {
            const prevPoint = element.path[i - 1]
            const currentPoint = element.path[i]
            
            if (i === 1) {
              // First segment - straight line
              ctx.lineTo(currentPoint.x, currentPoint.y)
            } else {
              // Use quadratic curve for smooth transitions
              // Control point is the previous point
              ctx.quadraticCurveTo(
                prevPoint.x,
                prevPoint.y,
                currentPoint.x,
                currentPoint.y
              )
            }
          }
          ctx.stroke()
        }
      }
    })
    
    // Redraw current pencil path if it exists (for in-progress pencil drawing)
    if (currentPencilPathRef.current.length > 0 && activeMarkupTool === 'pencil') {
      applyMarkupSettings(ctx)
      
      if (currentPencilPathRef.current.length === 1) {
        // Single point
        const p = currentPencilPathRef.current[0]
        ctx.beginPath()
        ctx.arc(p.x, p.y, getLineWidth(markupThickness) / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Draw smooth curves using quadratic curves
        ctx.beginPath()
        const firstPoint = currentPencilPathRef.current[0]
        ctx.moveTo(firstPoint.x, firstPoint.y)
        
        for (let i = 1; i < currentPencilPathRef.current.length; i++) {
          const prevPoint = currentPencilPathRef.current[i - 1]
          const currentPoint = currentPencilPathRef.current[i]
          
          if (i === 1) {
            // First segment - straight line
            ctx.lineTo(currentPoint.x, currentPoint.y)
          } else {
            // Use quadratic curve for smooth transitions
            ctx.quadraticCurveTo(
              prevPoint.x,
              prevPoint.y,
              currentPoint.x,
              currentPoint.y
            )
          }
        }
        ctx.stroke()
      }
    }
  }
  
  const getCanvasCoordinates = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const container = containerRef.current
    if (!container) return null
    return getCanvasCoordinatesUtil(container, clientX, clientY, true)
  }
  
  const handleMarkupPointerDown = (event: React.PointerEvent) => {
    if (!markupMode || !activeMarkupTool) return
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY)
    if (!coords) return
    
    isDrawingRef.current = true
    drawingStartRef.current = coords
    
    if (activeMarkupTool === 'text') {
      // For text, create input at click position
      createTextElement(coords.x, coords.y)
    } else if (activeMarkupTool === 'pencil') {
      // Initialize pencil path - store original coordinates for smooth drawing
      currentPencilPathRef.current = [coords]
      lastPencilPointRef.current = coords
      const ctx = getCanvasContext()
      if (ctx) {
        applyMarkupSettings(ctx)
        ctx.beginPath()
        ctx.moveTo(coords.x, coords.y)
      }
    }
  }
  
  const handleMarkupPointerMove = (event: React.PointerEvent) => {
    if (!markupMode || !activeMarkupTool || !isDrawingRef.current) return
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY)
    if (!coords || !drawingStartRef.current) return
    
    const ctx = getCanvasContext()
    if (!ctx) return
    
    if (activeMarkupTool === 'pencil') {
      // Store original coordinates for smooth drawing
      currentPencilPathRef.current.push(coords)
      
      applyMarkupSettings(ctx)
      
      const lastPoint = lastPencilPointRef.current
      if (lastPoint) {
        // Use quadratic curve for smooth transitions between points
        // Control point is the previous point, creating smooth curves
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.quadraticCurveTo(
          lastPoint.x,
          lastPoint.y,
          coords.x,
          coords.y
        )
        ctx.stroke()
      } else {
        // First point
        ctx.beginPath()
        ctx.moveTo(coords.x, coords.y)
        ctx.stroke()
      }
      
      lastPencilPointRef.current = coords
    } else if (activeMarkupTool === 'arrow' || activeMarkupTool === 'cloud') {
      // For arrow and cloud, redraw all saved elements and show preview
      redrawMarkupCanvas()
      
      // Draw preview with current settings
      applyMarkupSettings(ctx)
      if (activeMarkupTool === 'arrow') {
        drawArrow(ctx, drawingStartRef.current, coords)
      } else if (activeMarkupTool === 'cloud') {
        drawCloud(ctx, drawingStartRef.current, coords)
      }
    }
  }
  
  const handleMarkupPointerUp = (event: React.PointerEvent) => {
    if (!markupMode || !activeMarkupTool || !isDrawingRef.current) return
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY)
    if (!coords || !drawingStartRef.current) return
    
    const ctx = getCanvasContext()
    if (!ctx) return
    
    if (activeMarkupTool === 'arrow' || activeMarkupTool === 'cloud') {
      // Redraw all saved elements first
      redrawMarkupCanvas()
      
      // Draw the final element and save it
      applyMarkupSettings(ctx)
      if (activeMarkupTool === 'arrow') {
        drawArrow(ctx, drawingStartRef.current, coords)
        markupElementsRef.current.push({
          type: 'arrow',
          data: { start: drawingStartRef.current, end: coords },
          id: `arrow-${Date.now()}`,
          color: markupColor,
          thickness: markupThickness
        })
      } else if (activeMarkupTool === 'cloud') {
        drawCloud(ctx, drawingStartRef.current, coords)
        markupElementsRef.current.push({
          type: 'cloud',
          data: { start: drawingStartRef.current, end: coords },
          id: `cloud-${Date.now()}`,
          color: markupColor,
          thickness: markupThickness
        })
      }
    } else if (activeMarkupTool === 'pencil') {
      // Pencil drawing is already drawn during move, save the path
      markupElementsRef.current.push({
        type: 'pencil',
        data: { start: drawingStartRef.current, end: coords },
        id: `pencil-${Date.now()}`,
        color: markupColor,
        thickness: markupThickness,
        path: [...currentPencilPathRef.current] // Store the complete path
      })
      // Clear current pencil path
      currentPencilPathRef.current = []
      lastPencilPointRef.current = null
    }
    
    isDrawingRef.current = false
    drawingStartRef.current = null
    lastPencilPointRef.current = null
  }
  
  const createTextElement = (x: number, y: number) => {
    const container = markupContainerRef.current
    if (!container) return
    
    const textDiv = document.createElement('div')
    textDiv.style.position = 'absolute'
    textDiv.style.left = `${x}px`
    textDiv.style.top = `${y}px`
    textDiv.style.background = 'rgba(255, 255, 255, 0.9)'
    textDiv.style.border = '2px solid #ff0000'
    textDiv.style.padding = '8px'
    textDiv.style.borderRadius = '4px'
    textDiv.style.cursor = 'text'
    textDiv.style.minWidth = '200px'
    textDiv.style.zIndex = '1000'
    textDiv.style.display = 'inline-block'
    
    const textarea = document.createElement('textarea')
    textarea.placeholder = 'Enter text...'
    textarea.style.border = 'none'
    textarea.style.outline = 'none'
    textarea.style.background = 'transparent'
    textarea.style.width = '400px'
    textarea.style.fontSize = '20px'
    textarea.style.resize = 'none'
    textarea.style.overflow = 'hidden'
    textarea.style.fontFamily = 'inherit'
    textarea.style.lineHeight = '1.4'
    textarea.style.padding = '0'
    textarea.style.margin = '0'
    textarea.style.boxSizing = 'border-box'
    
    // Calculate single line height (fontSize * lineHeight)
    const singleLineHeight = 20 * 1.4 // 28px for 20px font with 1.4 line height
    
    // Set initial height to exactly one line
    textarea.style.height = `${singleLineHeight}px`
    textarea.style.minHeight = `${singleLineHeight}px`
    
    // Auto-resize function - only expand when text wraps
    const autoResize = () => {
      // Reset height to single line to get accurate scrollHeight
      textarea.style.height = `${singleLineHeight}px`
      const scrollHeight = textarea.scrollHeight
      
      // Only set new height if content actually requires more than one line
      if (scrollHeight > singleLineHeight) {
        textarea.style.height = `${scrollHeight}px`
      } else {
        textarea.style.height = `${singleLineHeight}px`
      }
    }
    
    // Auto-resize on input
    textarea.addEventListener('input', autoResize)
    
    // Also resize on paste
    textarea.addEventListener('paste', () => {
      setTimeout(autoResize, 0)
    })
    
    textDiv.appendChild(textarea)
    container.appendChild(textDiv)
    
    textarea.focus()
    
    const id = `text-${Date.now()}`
    textElementsRef.current.push({
      id,
      element: textDiv,
      x,
      y
    })
    
    markupElementsRef.current.push({
      type: 'text',
      data: { x, y, text: '' },
      id
    })
    
    // Update text on blur
    textarea.addEventListener('blur', () => {
      const textData = markupElementsRef.current.find(el => el.id === id)
      if (textData) {
        textData.data.text = textarea.value
      }
    })
    
    // Remove on double click
    textDiv.addEventListener('dblclick', () => {
      textDiv.remove()
      textElementsRef.current = textElementsRef.current.filter(el => el.id !== id)
      markupElementsRef.current = markupElementsRef.current.filter(el => el.id !== id)
    })
  }
  
  // Setup canvas on mount and resize
  useEffect(() => {
    if (markupMode) {
      setupMarkupCanvas()
      const handleResize = () => setupMarkupCanvas()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [markupMode])
  
  // Fetch element data when context menu opens
  useEffect(() => {
    if (!contextMenu.visible || !filename) {
      setElementData({ loading: false, data: null, error: null })
      return
    }
    
    // In assembly mode, use assembly_id; otherwise use productId
    const elementId = selectionMode === 'assemblies' && contextMenu.assemblyId 
      ? contextMenu.assemblyId 
      : contextMenu.productId
    
    if (!elementId) {
      setElementData({ loading: false, data: null, error: null })
      return
    }
    
    const fetchElementData = async () => {
      setElementData({ loading: true, data: null, error: null })
      
      try {
        const encodedFilename = encodeURIComponent(filename)
        const url = `/api/element-full/${elementId}?filename=${encodedFilename}`
        console.log('[CONTEXT_MENU] Fetching full element data:', {
          filename,
          encodedFilename,
          elementId,
          mode: selectionMode,
          isAssembly: selectionMode === 'assemblies',
          url
        })
        
        const response = await fetch(url)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[CONTEXT_MENU] API error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          })
          throw new Error(`Failed to fetch element data (${response.status}): ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('[CONTEXT_MENU] Received full element data:', data)
        setElementData({ loading: false, data, error: null })
      } catch (error) {
        console.error('[CONTEXT_MENU] Error fetching element data:', error)
        setElementData({ 
          loading: false, 
          data: null, 
          error: error instanceof Error ? error.message : 'Failed to fetch element data' 
        })
      }
    }
    
    fetchElementData()
  }, [contextMenu.visible, contextMenu.productId, contextMenu.assemblyId, filename, selectionMode])
  
  // Apply filter colors to meshes
  useEffect(() => {
    applyFiltersToModel(modelRef.current, filters, { originalMaterialsRef })
  }, [filters])
  
  // Close context menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!contextMenu.visible) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking on the context menu itself
      if (!target.closest('.fixed.z-50.bg-white')) {
        setContextMenu({ visible: false, x: 0, y: 0, element: null, productId: null, assemblyId: null })
        setElementData({ loading: false, data: null, error: null })
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu({ visible: false, x: 0, y: 0, element: null, productId: null, assemblyId: null })
        setElementData({ loading: false, data: null, error: null })
      }
    }
    
    // Use setTimeout to avoid immediate closure
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu.visible])

  return (
    <div className="h-full flex flex-col">
      <SelectedElementBanner
        visible={!!selectedElement}
        elementType={selectedElement?.type || ''}
        expressID={selectedElement?.expressID || 0}
      />
      <div ref={containerRef} className="flex-1 relative">
        <ContextMenu
          contextMenu={contextMenu}
          elementData={elementData}
          selectionMode={selectionMode}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0, element: null, productId: null, assemblyId: null })}
        />
        
        <MarkupCanvas
          visible={markupMode}
          activeMarkupTool={activeMarkupTool}
          canvasRef={markupCanvasRef}
          containerRef={markupContainerRef}
              onPointerDown={handleMarkupPointerDown}
              onPointerMove={handleMarkupPointerMove}
              onPointerUp={handleMarkupPointerUp}
        />
        
        <LoadingState 
          isLoading={isLoading} 
          loadError={loadError} 
          conversionStatus={conversionStatus} 
        />
        
        {/* Floating control panel at the bottom */}
        <ControlPanel
          visible={!!modelRef.current}
          selectionMode={selectionMode}
          onSelectionModeChange={(mode) => {
            selectionModeRef.current = mode
            setSelectionMode(mode)
          }}
          enableMeasurement={enableMeasurement}
          measurementMode={measurementMode}
          onToggleMeasurement={() => {
                    const newMode = !measurementModeRef.current
                    console.log('[MEASUREMENT] Button clicked, setting mode to:', newMode)
                    measurementModeRef.current = newMode
                    setMeasurementMode(newMode)
                    if (!newMode) {
                      console.log('[MEASUREMENT] Clearing in-progress measurement')
                      clearMeasurement()
                      if (containerRef.current) {
                        containerRef.current.style.cursor = 'default'
                      }
                    }
                  }}
          onClearAllMeasurements={() => {
                    console.log('[MEASUREMENT] Clear all measurements button clicked')
                    clearAllMeasurements()
                  }}
          enableClipping={enableClipping}
          clippingMode={clippingMode}
          activeClipPlane={activeClipPlane}
          clipAmount={clipAmount}
          onToggleClipping={() => {
                      console.log('[CLIPPING] Toggle clipping mode')
                      handleToggleClipping()
                    }}
          onSelectClipPlane={(planeKey) => {
                              console.log('[CLIPPING] Select plane', planeKey)
                              handleSelectClipPlane(planeKey)
                            }}
          onClipAmountChange={handleClipSliderChange}
          markupMode={markupMode}
          activeMarkupTool={activeMarkupTool}
          markupColor={markupColor}
          markupThickness={markupThickness}
          onToggleMarkup={handleToggleMarkup}
          onSetMarkupTool={setActiveMarkupTool}
          onSetMarkupColor={setMarkupColor}
          onSetMarkupThickness={setMarkupThickness}
          onClearAllMarkups={clearAllMarkups}
          onSaveScreenshot={handleSaveScreenshot}
          onCopyScreenshot={handleCopyScreenshot}
          selectedCount={selectedMeshesRef.current.length}
          onTransparent={() => {
                  const productIds = [...selectedProductIdsRef.current]
                  console.log('[BUTTON] Transparent clicked, current selection:', {
                    productIds: JSON.stringify(productIds),
                    productIdsArray: productIds,
                    meshes: selectedMeshesRef.current.length,
                    meshNames: selectedMeshesRef.current.map(m => m.name)
                  })
                  handleTransparent()
                }}
          onHide={() => {
                  const productIds = [...selectedProductIdsRef.current]
                  console.log('[BUTTON] Hide clicked, current selection:', {
                    productIds: JSON.stringify(productIds),
                    productIdsArray: productIds,
                    meshes: selectedMeshesRef.current.length,
                    meshNames: selectedMeshesRef.current.map(m => m.name)
                  })
                  handleHide()
                }}
          onHideAllExcept={() => {
                  const productIds = [...selectedProductIdsRef.current]
                  console.log('[BUTTON] Hide All Except clicked, current selection:', {
                    productIds: JSON.stringify(productIds),
                    productIdsArray: productIds,
                    meshes: selectedMeshesRef.current.length,
                    meshNames: selectedMeshesRef.current.map(m => m.name)
                  })
                  handleHideAllExcept()
                }}
          onShowAll={() => {
                  console.log('[BUTTON] Show All clicked')
                  handleShowAll()
                }}
        />
      </div>
    </div>
  )
}
