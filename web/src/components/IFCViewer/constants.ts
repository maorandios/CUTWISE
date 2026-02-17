/**
 * IFCViewer Constants and Configuration
 */

// Interaction thresholds
export const DRAG_THRESHOLD_PX = 4
export const SNAP_DISTANCE = 0.5 // meters
export const DOUBLE_CLICK_DELAY = 300 // milliseconds

// Camera settings
export const DEFAULT_CAMERA_FOV = 75
export const DEFAULT_CAMERA_NEAR = 0.01
export const DEFAULT_CAMERA_FAR = 10000
export const CAMERA_ANIMATION_DURATION = 300 // milliseconds

// Measurement settings
export const MEASUREMENT_DOT_SIZE_PX = 8
export const MEASUREMENT_ARROW_HEAD_LENGTH_RATIO = 0.1
export const MEASUREMENT_ARROW_HEAD_WIDTH_RATIO = 0.05
export const MEASUREMENT_ARROW_COLOR = 0xff0000 // Red

// Lighting settings
export const AMBIENT_LIGHT_INTENSITY = 0.5
export const HEMISPHERE_LIGHT_INTENSITY = 0.5
export const DIRECTIONAL_LIGHT_INTENSITY = 1.6
export const TONE_MAPPING_EXPOSURE = 1.2

// Material settings
export const DEFAULT_METALNESS = 0.1
export const DEFAULT_ROUGHNESS = 0.8
export const TRANSPARENT_OPACITY = 0.3
export const HIGHLIGHT_EMISSIVE_INTENSITY = 0.3

// Colors
export const BACKGROUND_COLOR = 0xf0f0f0
export const HIGHLIGHT_COLOR = 0xffff00 // Yellow
export const GREY_FILTER_COLOR = 0x404040
export const SELECTION_COLOR = 0xffff00 // Yellow

// Renderer settings
export const MAX_PIXEL_RATIO = 2
export const SHADOW_MAP_ENABLED = true

// Canvas settings
export const CANVAS_IMAGE_SMOOTHING = true
export const CANVAS_IMAGE_SMOOTHING_QUALITY = 'high' as ImageSmoothingQuality

// Markup settings
export const MARKUP_LINE_WIDTHS = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 8
} as const

export const MARKUP_COLORS = {
  red: '#ff0000',
  black: '#000000',
  yellow: '#ffff00',
  green: '#00ff00',
  blue: '#0000ff'
} as const

// Clipping settings
export const CLIPPING_PLANE_NORMALS = {
  top: { x: 0, y: -1, z: 0 },
  bottom: { x: 0, y: 1, z: 0 },
  left: { x: 1, y: 0, z: 0 },
  right: { x: -1, y: 0, z: 0 },
  front: { x: 0, y: 0, z: 1 },
  back: { x: 0, y: 0, z: -1 }
} as const

// File settings
export const SUPPORTED_FILE_TYPES = ['.ifc', '.gltf', '.glb'] as const
export const MAX_FILE_SIZE_MB = 500

// API endpoints
export const API_ENDPOINTS = {
  convertGltf: (filename: string) => `/api/convert-gltf/${filename}`,
  checkGltf: (filename: string) => `/api/check-gltf/${filename}`,
  elementData: (filename: string, productId: number) => `/api/element-data/${filename}/${productId}`,
  assemblyData: (filename: string, assemblyId: number) => `/api/assembly-data/${filename}/${assemblyId}`
} as const

// Performance settings
export const DEBOUNCE_DELAY_MS = 100
export const THROTTLE_DELAY_MS = 16 // ~60fps

// Z-index layers
export const Z_INDEX = {
  canvas: 1,
  overlay: 10,
  controls: 20,
  contextMenu: 50,
  modal: 100,
  tooltip: 1000
} as const

