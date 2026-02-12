/**
 * Get the backend API base URL
 * Works with both localhost and network IP access
 */
export function getBackendUrl(): string {
  const hostname = window.location.hostname
  // If accessing via localhost, use localhost for backend
  // Otherwise use the same hostname (network IP)
  const backendHost = hostname === 'localhost' ? 'localhost' : hostname
  return `http://${backendHost}:8000`
}

/**
 * Make an API request to the backend
 */
export async function apiRequest(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${getBackendUrl()}${endpoint}`
  return fetch(url, options)
}






