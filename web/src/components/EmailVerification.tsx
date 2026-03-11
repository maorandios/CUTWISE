import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { WasteOptimizationPreview } from './WasteOptimizationPreview'
import { NestingPreview } from './NestingPreview'
import { BOMPreview } from './BOMPreview'
import { ModelViewerPreview } from './ModelViewerPreview'

interface EmailVerificationProps {
  email: string
  onVerified: () => void
}

const EmailVerification = ({ email, onVerified }: EmailVerificationProps) => {
  const [verified, setVerified] = useState(false)
  const [resending, setResending] = useState(false)

  // Listen for auth state changes AND poll for verification status
  useEffect(() => {
    // Mark this tab as the waiting tab (use sessionStorage so it's unique per tab)
    sessionStorage.setItem('cutwise_is_waiting_tab', 'true')
    console.log('[EmailVerification] Marked this tab as waiting tab (sessionStorage)')
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[EmailVerification] Auth event:', event)
        
        // When user is verified and signed in
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[EmailVerification] User verified in WAITING TAB!')
          // Mark that this tab should stay on success screen
          sessionStorage.setItem('cutwise_waiting_tab_verified', 'true')
          setVerified(true)
        }
      }
    )

    // Also poll for verification status every 2 seconds
    const pollInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('[EmailVerification] User session detected via polling in WAITING TAB')
        sessionStorage.setItem('cutwise_waiting_tab_verified', 'true')
        setVerified(true)
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [onVerified])

  const handleResendEmail = async () => {
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        toast.error('Failed to resend verification email')
        console.error('Resend error:', error)
      } else {
        toast.success('Verification email sent! Check your inbox.')
      }
    } catch (err) {
      toast.error('An error occurred while resending email')
      console.error('Resend error:', err)
    } finally {
      setResending(false)
    }
  }

  // Show success message after verification
  if (verified) {
    return (
      <div className="min-h-screen flex overflow-hidden">
        {/* Left Side - Success Message */}
        <div className="w-1/2 flex items-center justify-center bg-white p-12 overflow-y-auto">
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
              {email}
            </p>

            {/* Instructions */}
            <div className="bg-primary/5 rounded-lg p-6">
              <p className="text-gray-700 text-lg">
                Your account is now active and ready to use!
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Preview Cards */}
        <div className="w-1/2 overflow-y-auto scroll-smooth">
          <div className="h-screen relative">
            <WasteOptimizationPreview />
            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">
              <span className="text-gray-300 text-sm font-medium">Scroll for more</span>
              <div className="w-10 h-10 rounded-full border-2 border-[#00FF9F] flex items-center justify-center bg-[#00817A]/20 animate-scroll-hint">
                <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
          <div className="h-screen relative">
            <NestingPreview />
            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">
              <span className="text-gray-300 text-sm font-medium">Scroll for more</span>
              <div className="w-10 h-10 rounded-full border-2 border-[#00FF9F] flex items-center justify-center bg-[#00817A]/20 animate-scroll-hint">
                <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
          <div className="h-screen relative">
            <BOMPreview />
            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">
              <span className="text-gray-300 text-sm font-medium">Scroll for more</span>
              <div className="w-10 h-10 rounded-full border-2 border-[#00FF9F] flex items-center justify-center bg-[#00817A]/20 animate-scroll-hint">
                <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
          <div className="h-screen relative">
            <ModelViewerPreview />
          </div>
        </div>

        {/* Add scroll hint animation */}
        <style>{`
          @keyframes scroll-hint {
            0%, 100% {
              transform: translateY(0);
              opacity: 1;
            }
            50% {
              transform: translateY(8px);
              opacity: 0.7;
            }
          }

          .animate-scroll-hint {
            animation: scroll-hint 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Verification Message */}
      <div className="w-1/2 flex items-center justify-center bg-white p-12 overflow-y-auto">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-12">
            <img 
              src="/Icons/Cutwise for pdf main.svg" 
              alt="Cutwise" 
              className="h-20 mx-auto"
            />
          </div>

          {/* Email Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-primary" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Check Your Email
          </h1>
          
          <p className="text-gray-600 mb-2">
            We sent a verification link to:
          </p>
          
          <p className="text-lg font-semibold text-primary mb-8">
            {email}
          </p>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Next Steps:</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span>Open your email inbox</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span>Click the verification link in the email from Cutwise</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span>You'll be automatically redirected to continue</span>
              </li>
            </ol>
          </div>

          {/* Waiting indicator */}
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">Waiting for verification</span>
          </div>

          {/* Resend link */}
          <div className="mt-8 text-sm text-gray-500">
            Didn't receive the email?{' '}
            <button 
              onClick={handleResendEmail}
              disabled={resending}
              className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-12">
            <p className="text-xs text-gray-400">
              You can close this tab after clicking the verification link in your email
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Preview Cards */}
      <div className="w-1/2 overflow-y-auto scroll-smooth">
        <div className="h-screen relative">
          <WasteOptimizationPreview />
          {/* Scroll Indicator */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">
            <span className="text-gray-300 text-sm font-medium">Scroll for more</span>
            <div className="w-10 h-10 rounded-full border-2 border-[#00FF9F] flex items-center justify-center bg-[#00817A]/20 animate-scroll-hint">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
        <div className="h-screen relative">
          <NestingPreview />
          {/* Scroll Indicator */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">
            <span className="text-gray-300 text-sm font-medium">Scroll for more</span>
            <div className="w-10 h-10 rounded-full border-2 border-[#00FF9F] flex items-center justify-center bg-[#00817A]/20 animate-scroll-hint">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
        <div className="h-screen relative">
          <BOMPreview />
          {/* Scroll Indicator */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">
            <span className="text-gray-300 text-sm font-medium">Scroll for more</span>
            <div className="w-10 h-10 rounded-full border-2 border-[#00FF9F] flex items-center justify-center bg-[#00817A]/20 animate-scroll-hint">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
        <div className="h-screen relative">
          <ModelViewerPreview />
        </div>
      </div>

      {/* Add scroll hint animation */}
      <style>{`
        @keyframes scroll-hint {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(8px);
            opacity: 0.7;
          }
        }

        .animate-scroll-hint {
          animation: scroll-hint 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default EmailVerification
