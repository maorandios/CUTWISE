import * as THREE from 'three'
import { FilterState } from '../../types'

export interface IFCViewerProps {
  filename: string
  gltfPath?: string
  gltfAvailable?: boolean
  enableMeasurement?: boolean // Feature flag for measurement tool
  enableClipping?: boolean // Feature flag for clipping planes
  filters?: FilterState
  report?: any // Report data to get plate thickness information
  isVisible?: boolean // Whether the viewer is currently visible (for CSS hiding support)
}

export type ClipPlaneKey = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'

export type SelectionMode = 'parts' | 'assemblies'

export type MarkupTool = 'pencil' | 'arrow' | 'cloud' | 'text'

export type MarkupColor = 'red' | 'black' | 'yellow' | 'green' | 'blue'

export type ElementState = 'normal' | 'transparent' | 'hidden'

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  element: THREE.Mesh | null
  productId: number | null
  assemblyId: number | null
}

export interface ElementData {
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
}

export interface MeasurementData {
  arrow: THREE.ArrowHelper | null
  label: HTMLDivElement | null
  dots: THREE.Mesh[]
  start: THREE.Vector3
  end: THREE.Vector3
}

export interface MarkupElement {
  type: 'pencil' | 'arrow' | 'cloud' | 'text'
  data: any
  id: string
  color?: string
  thickness?: number
  path?: Array<{ x: number; y: number }>
}

export interface TextElement {
  id: string
  element: HTMLDivElement
  x: number
  y: number
}

export interface ModelBounds {
  min: THREE.Vector3
  max: THREE.Vector3
  size: THREE.Vector3
  center: THREE.Vector3
}

