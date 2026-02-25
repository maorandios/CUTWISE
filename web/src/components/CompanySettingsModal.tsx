import { useState, useEffect } from 'react'

interface CompanyDetails {
  companyName: string
  address: string
  country: string
  phoneNumber: string
  companySize: '1' | '1-10' | '10-50' | '50-300' | '300+' | ''
}

interface CompanySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (details: CompanyDetails) => void
  currentDetails: CompanyDetails
}

const CompanySettingsModal = ({ isOpen, onClose, onSave, currentDetails }: CompanySettingsModalProps) => {
  const [details, setDetails] = useState<CompanyDetails>(currentDetails)
  const [error, setError] = useState('')

  useEffect(() => {
    setDetails(currentDetails)
  }, [currentDetails, isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    if (!details.companyName.trim()) {
      setError('Company name is required')
      return
    }
    
    setError('')
    onSave(details)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Company Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={details.companyName}
              onChange={(e) => setDetails({ ...details, companyName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Enter your company name"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              id="address"
              type="text"
              value={details.address}
              onChange={(e) => setDetails({ ...details, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Enter your address"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              id="country"
              type="text"
              value={details.country}
              onChange={(e) => setDetails({ ...details, country: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Enter your country"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={details.phoneNumber}
              onChange={(e) => setDetails({ ...details, phoneNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
              Company Size <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <select
              id="companySize"
              value={details.companySize}
              onChange={(e) => setDetails({ ...details, companySize: e.target.value as CompanyDetails['companySize'] })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select company size</option>
              <option value="1">Just me (1)</option>
              <option value="1-10">Small team (1-10)</option>
              <option value="10-50">Medium (10-50)</option>
              <option value="50-300">Large (50-300)</option>
              <option value="300+">Enterprise (300+)</option>
            </select>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompanySettingsModal
