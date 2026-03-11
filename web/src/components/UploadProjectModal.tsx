import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TermsContent, PrivacyContent } from './LegalContent'

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
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        if (!projectName) {
          setProjectName(file.name.replace('.ifc', ''))
        }
      } else {
        alert('Please upload an IFC file')
      }
    }
  }

  const handleUpload = () => {
    if (projectName.trim() && selectedFile) {
      onUpload(projectName.trim(), selectedFile)
      setProjectName('')
      setSelectedFile(null)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setProjectName('')
      setSelectedFile(null)
      setAcceptedTerms(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="space-y-3 pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-2xl">Create New Project</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Upload your IFC file to get started</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Project Name Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <Label htmlFor="projectName" className="text-sm font-medium text-gray-700">
                Project Name <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter a descriptive name for your project"
              disabled={loading}
              className="h-11"
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <Label className="text-sm font-medium text-gray-700">
                IFC File <span className="text-red-500">*</span>
              </Label>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !loading && fileInputRef.current?.click()}
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
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {!loading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove file
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Drop your IFC file here</p>
                    <p className="text-sm text-gray-500">or click to browse from your computer</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Supported format: .ifc</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start gap-3 pt-2 pb-2">
            <div 
              onClick={() => !loading && setAcceptedTerms(!acceptedTerms)}
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                acceptedTerms 
                  ? 'bg-primary border-primary' 
                  : 'border-gray-300 hover:border-primary'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {acceptedTerms && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <label className="text-sm text-gray-600 cursor-pointer leading-relaxed" onClick={() => !loading && setAcceptedTerms(!acceptedTerms)}>
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTermsModal(true)
                }}
                className="text-primary font-semibold hover:underline"
              >
                Terms of Service
              </button>
              {' '}and{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPrivacyModal(true)
                }}
                className="text-primary font-semibold hover:underline"
              >
                Privacy Policy
              </button>
            </label>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 py-4 bg-primary/5 rounded-lg border border-primary/20">
              <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-primary">Creating your project...</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="h-11 px-6">
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!projectName.trim() || !selectedFile || !acceptedTerms || loading}
            className="h-11 px-6"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </DialogContent>

      {/* Terms of Service Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <TermsContent />
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <PrivacyContent />
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

export default UploadProjectModal
