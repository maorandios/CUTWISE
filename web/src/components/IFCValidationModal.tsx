import { X, AlertTriangle, Package, AlertCircle } from 'lucide-react'

interface UnnumberedPart {
  id: number
  part_number: string
  type: string
  profile_name: string
  length: number
}

interface ValidationResult {
  is_valid: boolean
  total_parts: number
  unnumbered_count: number
  unnumbered_parts: UnnumberedPart[]
}

interface IFCValidationModalProps {
  validation: ValidationResult
  onCancel: () => void
  onContinue: () => void
}

const IFCValidationModal = ({ validation, onCancel, onContinue }: IFCValidationModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative bg-amber-50 border-b border-amber-200 px-8 py-8">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 hover:bg-amber-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              IFC Model Not Ready
            </h2>
            <p className="text-gray-600 max-w-md leading-relaxed">
              This model has not been properly numbered in Tekla. Parts with <span className="font-mono font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">?</span> indicate incomplete numbering.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Total Parts Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Parts</div>
                <div className="text-3xl font-bold text-gray-900">{validation.total_parts}</div>
              </div>
            </div>

            {/* Unnumbered Parts Card */}
            <div className="bg-white border border-amber-200 rounded-xl p-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Unnumbered Parts</div>
                <div className="text-3xl font-bold text-amber-600">{validation.unnumbered_count}</div>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Why This Matters
            </h3>
            <div className="space-y-2.5 text-sm text-gray-700">
              <p className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5"></span>
                <span>Unnumbered parts will cause incorrect nesting reports and material calculations</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5"></span>
                <span>We check this before processing to save your credits for valid models</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5"></span>
                <span>Please run <span className="font-semibold">Numbering → Perform Numbering</span> in Tekla and re-export the IFC</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-6 bg-gray-50 flex items-center justify-between gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors"
          >
            Cancel Upload
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-6 py-3 bg-amber-600 text-white font-semibold rounded-full hover:bg-amber-700 transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

export default IFCValidationModal
