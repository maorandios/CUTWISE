/**
 * Validation utilities
 */

/**
 * Check if value is a valid number
 */
export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

/**
 * Check if coordinates are within bounds
 */
export function isWithinBounds(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return x >= 0 && x <= width && y >= 0 && y <= height
}

/**
 * Check if file extension is supported
 */
export function isSupportedFileType(filename: string, supportedTypes: readonly string[]): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return supportedTypes.some(type => type.toLowerCase() === ext)
}

/**
 * Check if file size is within limit
 */
export function isValidFileSize(sizeInBytes: number, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024
  return sizeInBytes > 0 && sizeInBytes <= maxBytes
}

/**
 * Validate product ID
 */
export function isValidProductId(id: any): boolean {
  return isValidNumber(id) && id > 0
}

/**
 * Validate color hex string
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color)
}

/**
 * Validate opacity value (0-1)
 */
export function isValidOpacity(opacity: number): boolean {
  return isValidNumber(opacity) && opacity >= 0 && opacity <= 1
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Clamp opacity to valid range
 */
export function clampOpacity(opacity: number): number {
  return clamp(opacity, 0, 1)
}

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0
}

/**
 * Check if array is empty
 */
export function isEmptyArray(arr: any[] | null | undefined): boolean {
  return !arr || arr.length === 0
}

/**
 * Check if object has own property safely
 */
export function hasProperty(obj: any, prop: string): boolean {
  return obj && Object.prototype.hasOwnProperty.call(obj, prop)
}

/**
 * Safe array access with default value
 */
export function safeArrayAccess<T>(arr: T[] | null | undefined, index: number, defaultValue: T): T {
  if (!arr || index < 0 || index >= arr.length) {
    return defaultValue
  }
  return arr[index]
}

/**
 * Safe object property access with default value
 */
export function safePropertyAccess<T>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  if (!obj) return defaultValue
  
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (!hasProperty(current, key)) {
      return defaultValue
    }
    current = current[key]
  }
  
  return current !== undefined ? current : defaultValue
}

