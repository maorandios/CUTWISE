import { useEffect, useRef, useState } from 'react'

interface MaorViewerProps {
  filename: string | null
}

export default function MaorViewer({ filename }: MaorViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'viewerReady') {
        console.log('[MaorViewer] Viewer ready')
        setIsReady(true)
      } else if (event.data.type === 'loadingStarted') {
        console.log('[MaorViewer] Loading started')
        setIsLoading(true)
        setLoadError(null)
      } else if (event.data.type === 'modelLoaded') {
        console.log('[MaorViewer] Model loaded')
        setIsLoading(false)
      } else if (event.data.type === 'modelLoadFailed') {
        console.error('[MaorViewer] Load failed:', event.data.error)
        setLoadError(event.data.error || 'Failed to load model')
        setIsLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Load model when filename changes
  useEffect(() => {
    if (!isReady || !filename || !iframeRef.current) return

    setIsLoading(true)
    setLoadError(null)

    // Send load command to iframe
    iframeRef.current.contentWindow?.postMessage({
      type: 'loadModel',
      url: `/storage/ifc/${filename}`,
      filename: filename
    }, '*')
  }, [isReady, filename])

  return (
    <div className="relative w-full h-full min-h-[600px] bg-white">
      {/* Iframe Viewer */}
      <iframe
        ref={iframeRef}
        src="/maor-viewer.html"
        className="absolute inset-0 w-full h-full border-0"
        style={{ minHeight: '600px' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10 pointer-events-none">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Loading IFC model...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center max-w-md p-6">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Model</h3>
            <p className="text-sm text-gray-600 mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Instructions when no file */}
      {!filename && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium">No model loaded</p>
            <p className="text-sm mt-2">Upload an IFC file to view it here</p>
          </div>
        </div>
      )}
    </div>
  )
}
