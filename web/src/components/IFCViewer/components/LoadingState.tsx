import React from 'react'

interface LoadingStateProps {
  isLoading: boolean
  loadError: string | null
  conversionStatus: string
}

export function LoadingState({ isLoading, loadError, conversionStatus }: LoadingStateProps) {
  // Show error state
  if (loadError) {
    return null // Error is handled by parent component
  }

  // Show loading state
  if (isLoading || conversionStatus) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">{conversionStatus || 'Loading 3D model...'}</p>
        </div>
      </div>
    )
  }

  return null
}

