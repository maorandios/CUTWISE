import { useState, useRef } from 'react'

interface UploadProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (projectName: string, file: File) => void
  loading: boolean
}

const UploadProjectModal = ({ isOpen, onClose, onUpload, loading }: UploadProjectModalProps) => {
  const [projectName, setProjectName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const ifcFile = files.find(f => f.name.toLowerCase().endsWith('.ifc'))
    
    if (ifcFile) {
      setSelectedFile(ifcFile)
      // Auto-fill project name from filename if empty
      if (!projectName) {
        setProjectName(ifcFile.name.replace('.ifc', ''))
      }
    } else {
      alert('Please upload an IFC file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.toLowerCase().endsWith('.ifc')) {
        setSelectedFile(file)
        // Auto-fill project name from filename if empty
        if (!projectName) {
          setProjectName(file.name.replace('.ifc', ''))
        }
      } else {
        alert('Please upload an IFC file')
      }
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!projectName.trim()) {
      alert('Please enter a project name')
      return
    }
    
    if (!selectedFile) {
      alert('Please select an IFC file')
      return
    }

    onUpload(projectName.trim(), selectedFile)
  }

  const handleClose = () => {
    if (!loading) {
      setProjectName('')
      setSelectedFile(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
          {!loading && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Name Input */}
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Enter project name"
              disabled={loading}
              required
            />
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IFC File
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : selectedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ifc"
                onChange={handleFileSelect}
                className="hidden"
                disabled={loading}
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <svg className="w-12 h-12 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  {!loading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">
                    Drag and drop your IFC file here
                  </p>
                  <p className="text-xs text-gray-500">
                    or click to browse
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 mt-2">Processing IFC file...</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !projectName.trim() || !selectedFile}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create New Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadProjectModal
