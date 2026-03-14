import { useState, useEffect } from 'react'
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
import { NestingPreview } from './NestingPreview'
import { WasteOptimizationPreview } from './WasteOptimizationPreview'
import { BOMPreview } from './BOMPreview'
import { ModelViewerPreview } from './ModelViewerPreview'

interface LoginProps {
  onLoginSuccess: () => void
  onSwitchToSignup: () => void
}

const Login = ({ onLoginSuccess, onSwitchToSignup }: LoginProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showCookieModal, setShowCookieModal] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const { signIn, signInWithGoogle, signInWithMagicLink } = useAuth()

  const FEATURE_SLIDES = [
    <WasteOptimizationPreview key="waste" />,
    <NestingPreview key="nesting" />,
    <BOMPreview key="bom" />,
    <ModelViewerPreview key="model" />
  ]
  const SLIDE_COUNT = FEATURE_SLIDES.length

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDE_COUNT)
    }, 4000)
    return () => clearInterval(timer)
  }, [SLIDE_COUNT])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        toast.error(error.message || 'Failed to log in')
        return
      }

      if (data.user) {
        toast.success('Welcome back!')
        onLoginSuccess()
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle()
      
      if (error) {
        toast.error(error.message || 'Failed to log in with Google')
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
      console.error('Google login error:', err)
    }
  }

  const handleMagicLinkLogin = async () => {
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setMagicLinkLoading(true)
    try {
      const { error } = await signInWithMagicLink(email)
      
      if (error) {
        toast.error(error.message || 'Failed to send magic link')
        return
      }

      toast.success('Check your email! We sent you a magic link to log in.')
    } catch (err) {
      toast.error('An unexpected error occurred')
      console.error('Magic link error:', err)
    } finally {
      setMagicLinkLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Login Form */}
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Enter your password"
                required
                disabled={loading}
                className="h-12 rounded-full"
              />
            </div>

            {/* Login Button */}
            <Button type="submit" disabled={loading} className="w-full h-12 text-base rounded-full">
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          {/* Magic Link Button */}
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleMagicLinkLogin}
              disabled={magicLinkLoading || !email}
              className="w-full h-12 text-base rounded-full border-2 border-primary hover:border-primary/80"
            >
              {magicLinkLoading ? 'Sending...' : 'Send Magic Link Instead'}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              No password needed - we'll email you a login link
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
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

          {/* Signup Link */}
          <div className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-primary font-semibold hover:underline"
            >
              Sign up
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

      {/* Right Side - Feature Carousel */}
      <div className="w-1/2 relative overflow-hidden bg-[#00817A]">
        <div className="h-full w-full relative">
          {FEATURE_SLIDES.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                idx === currentSlide ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 pointer-events-none'
              }`}
              style={{ transitionProperty: 'opacity, transform' }}
            >
              {slide}
            </div>
          ))}
        </div>
        {/* Animated Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50">
          {FEATURE_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#00FF9F]/50 ${
                idx === currentSlide ? 'w-8 h-3 bg-[#00FF9F]' : 'w-3 h-3 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
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

export default Login
