import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TermsContent, PrivacyContent, CookieContent } from './LegalContent'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import EmailVerification from './EmailVerification'
import { NestingPreview } from './NestingPreview'
import { WasteOptimizationPreview } from './WasteOptimizationPreview'
import { BOMPreview } from './BOMPreview'
import { ModelViewerPreview } from './ModelViewerPreview'

interface SignupProps {
  onSignupSuccess: () => void
  onSwitchToLogin: () => void
}

const Signup = ({ onSignupSuccess, onSwitchToLogin }: SignupProps) => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showCookieModal, setShowCookieModal] = useState(false)
  const [showVerificationScreen, setShowVerificationScreen] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const { signUp, signInWithGoogle } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!fullName || !email || !password) return

    setLoading(true)
    try {
      const { data, error } = await signUp(email, password, fullName)
      
      if (error) {
        // Check for specific error messages
        let errorMsg = error.message || 'Failed to create account'
        
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          errorMsg = 'This email is already registered. Please log in instead.'
        } else if (error.message?.includes('User already registered')) {
          errorMsg = 'This email is already registered. Please log in instead.'
        }
        
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      if (data.user) {
        // Check if this is a new user or existing user
        // Supabase returns identities array - if empty, user already existed
        if (data.user.identities && data.user.identities.length === 0) {
          // User already exists
          const errorMsg = 'This email is already registered. Please log in instead.'
          setError(errorMsg)
          toast.error(errorMsg)
          return
        }
        
        // Mark this tab as the "waiting" tab (use localStorage for persistence)
        localStorage.setItem('cutwise_waiting_for_verification', 'true')
        console.log('[Signup] Set waiting marker in localStorage')
        
        // Show verification screen instead of immediately proceeding
        setSignupEmail(email)
        setShowVerificationScreen(true)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      // Mark this as a new signup before OAuth redirect
      sessionStorage.setItem('cutwise_google_signup', 'true')
      console.log('[Signup] Marked Google signup in sessionStorage')
      
      const { error } = await signInWithGoogle()
      
      if (error) {
        toast.error(error.message || 'Failed to sign up with Google')
        sessionStorage.removeItem('cutwise_google_signup')
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
      console.error('Google signup error:', err)
      sessionStorage.removeItem('cutwise_google_signup')
    }
  }

  // Show verification screen if user just signed up
  if (showVerificationScreen) {
    return <EmailVerification email={signupEmail} onVerified={onSignupSuccess} />
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Signup Form */}
      <div className="w-1/2 flex items-center justify-center bg-white p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-12 text-center">
            <img 
              src="/Icons/Cutwise for pdf main.svg" 
              alt="Cutwise" 
              className="h-20 mx-auto"
            />
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={loading}
                className="h-12 rounded-full"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
                className="h-12 rounded-full"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                required
                disabled={loading}
                className="h-12 rounded-full"
              />
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
                className="h-12 rounded-full"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Signup Button */}
            <Button type="submit" disabled={loading} className="w-full h-12 text-base rounded-full">
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Google Signup Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full h-12 rounded-full"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Login Link */}
          <div className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary font-semibold hover:underline"
            >
              Log in
            </button>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-xs text-gray-500 mb-3">© 2026 Cutwise. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-gray-500 hover:text-primary hover:underline"
              >
                Terms of Service
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="text-gray-500 hover:text-primary hover:underline"
              >
                Privacy Policy
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setShowCookieModal(true)}
                className="text-gray-500 hover:text-primary hover:underline"
              >
                Cookie Policy
              </button>
            </div>
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

      {/* Terms of Service Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <TermsContent />
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <PrivacyContent />
        </DialogContent>
      </Dialog>

      {/* Cookie Policy Modal */}
      <Dialog open={showCookieModal} onOpenChange={setShowCookieModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cookie Policy</DialogTitle>
          </DialogHeader>
          <CookieContent />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Signup
