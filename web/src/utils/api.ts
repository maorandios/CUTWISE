/**
 * Get the backend API base URL
 * Works with both localhost, network IP, and production deployment
 */
export function getBackendUrl(): string {
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  // If accessing via localhost, use localhost with port 8000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:8000`
  }
  
  // For production (Railway, Vercel, etc.), use same origin (no port, same protocol)
  return `${protocol}//${hostname}`
}

/**
 * Make an API request to the backend
 */
export async function apiRequest(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${getBackendUrl()}${endpoint}`
  return fetch(url, options)
}

/**
 * Validate IFC file for numbering completeness
 */
export async function validateIFC(file: File): Promise<{
  is_valid: boolean
  total_parts: number
  unnumbered_count: number
  unnumbered_parts: Array<{
    id: number
    part_number: string
    type: string
    profile_name: string
    length: number
  }>
}> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await apiRequest('/api/validate-ifc', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    throw new Error(`Validation failed: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}






