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






