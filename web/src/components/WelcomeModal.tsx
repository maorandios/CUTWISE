import { useEffect, useState } from 'react'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadClick: () => void
  userName: string
}

export function WelcomeModal({ isOpen, onClose, onUploadClick, userName }: WelcomeModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
      // Stop confetti after 4 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60]" style={{ perspective: '500px' }}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'][Math.floor(Math.random() * 7)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="animate-in zoom-in-50 duration-500">
                <img 
                  src="/Icons/Cutwise for pdf main.svg" 
                  alt="Cutwise" 
                  className="h-16 w-auto"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                Welcome to Cutwise! 🎉
              </h2>
              <p className="text-lg text-gray-600">
                Your account is ready to go!
              </p>
            </div>

            {/* Free Credit Info */}
            <div className="relative bg-gradient-to-br from-[#008A67] to-[#0A5048] rounded-2xl p-8 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              
              <div className="relative z-10 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-2">
                  <div className="relative">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold">€</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">1 Free Project</h3>
                  <p className="text-white/90 text-sm">Worth €29 • Added to your account</p>
                </div>
                <p className="text-white/80 text-sm max-w-md mx-auto pt-2">
                  Upload your first IFC file and experience the power of automated nesting and cutting optimization
                </p>
              </div>
            </div>

            {/* Features List */}
            <div className="bg-gray-50 rounded-xl p-6 text-left">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">What You Can Do:</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#008A67] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Export Bill of Materials</p>
                    <p className="text-xs text-gray-600">Get detailed component lists</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#008A67] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Export Optimized Cutting Plan</p>
                    <p className="text-xs text-gray-600">Maximize material efficiency</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#008A67] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Materials Analysis</p>
                    <p className="text-xs text-gray-600">Comprehensive usage insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#008A67] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Live 3D Model Profile Selection</p>
                    <p className="text-xs text-gray-600">Interactive visualization</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#008A67] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Project Metrics</p>
                    <p className="text-xs text-gray-600">Detailed analytics and reports</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors"
              >
                Explore Later
              </button>
              <button
                onClick={() => {
                  onUploadClick()
                  onClose()
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#008A67] to-[#0A5048] text-white font-semibold rounded-full hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload First Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti Animation Styles */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </>
  )
}
