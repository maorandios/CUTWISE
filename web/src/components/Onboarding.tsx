import { useState } from 'react'

interface CompanyDetails {
  companyName: string
  address: string
  country: string
  phoneNumber: string
  companySize: '1' | '1-10' | '10-50' | '50-300' | '300+' | ''
}

interface OnboardingProps {
  onComplete: (details: CompanyDetails) => void
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState<CompanyDetails>({
    companyName: '',
    address: '',
    country: '',
    phoneNumber: '',
    companySize: ''
  })
  const [error, setError] = useState('')

  const handleNext = () => {
    if (step === 1 && !details.companyName.trim()) {
      setError('Company name is required')
      return
    }
    
    setError('')
    if (step < 2) {
      setStep(step + 1)
    } else {
      onComplete(details)
    }
  }

  const handleSkip = () => {
    onComplete(details)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl">
        {/* Logo and Progress */}
        <div className="text-center mb-8">
          <img 
            src="/Icons/cutwise - logo.svg" 
            alt="Cutwise" 
            className="h-12 mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Cutwise!</h2>
          <p className="text-gray-600">Let's set up your company profile</p>
          
          {/* Progress Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          </div>
        </div>

        {/* Onboarding Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: Company Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Company Information</h3>
                <p className="text-gray-600 text-sm">Tell us about your company</p>
              </div>

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
                  autoFocus
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

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Contact & Size */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Details</h3>
                <p className="text-gray-600 text-sm">Help us understand your needs better</p>
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
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSkip}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Skip for now
            </button>
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {step === 2 ? 'Complete' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Step Indicator Text */}
        <div className="text-center mt-4 text-sm text-gray-500">
          Step {step} of 2
        </div>
      </div>
    </div>
  )
}

export default Onboarding
