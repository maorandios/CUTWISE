import { useAuth } from '../hooks/useAuth'

const VerificationSuccess = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Success Message */}
      <div className="w-1/2 flex items-center justify-center bg-white p-12">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-12">
            <img 
              src="/Icons/Cutwise for pdf main.svg" 
              alt="Cutwise" 
              className="h-20 mx-auto"
            />
          </div>

          {/* Success Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
              <svg 
                className="w-12 h-12 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Email Verified!
          </h1>
          
          <p className="text-gray-600 mb-2">
            Your account has been successfully verified.
          </p>
          
          <p className="text-lg font-semibold text-primary mb-8">
            {user?.email}
          </p>

          {/* Instructions */}
          <div className="bg-primary/5 rounded-lg p-6">
            <p className="text-gray-700 text-lg">
              Your account is now active and ready to use!
            </p>
          </div>
          
          {/* Footer note */}
          <div className="mt-8">
            <p className="text-sm text-gray-500">
              You can close this tab now.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="w-1/2 bg-gray-100">
        <img 
          src="/path-to-your-image.jpg" 
          alt="Cutwise" 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  )
}

export default VerificationSuccess
