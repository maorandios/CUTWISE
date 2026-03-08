import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LottieLoader } from './LottieLoader'
import { useAuth } from '../hooks/useAuth'

interface CompanyDetails {
  companyName: string
  address: string
  country: string
  phoneNumber: string
  companySize: '1' | '1-10' | '10-50' | '50-300' | '300+' | ''
  email?: string
}

interface OnboardingProps {
  onComplete: (details: CompanyDetails) => void
  showWelcome?: boolean
}

const Onboarding = ({ onComplete, showWelcome = true }: OnboardingProps) => {
  const { user } = useAuth()
  const [step, setStep] = useState(showWelcome ? 0 : 1)
  const [details, setDetails] = useState<CompanyDetails>({
    companyName: '',
    address: '',
    country: '',
    phoneNumber: '',
    companySize: '',
    email: user?.email || ''
  })
  const [error, setError] = useState('')

  const handleComplete = () => {
    if (!details.companyName.trim()) {
      setError('Company name is required')
      return
    }
    
    setError('')
    onComplete({
      ...details,
      email: user?.email || details.email
    })
  }

  const handleSkip = () => {
    if (!details.companyName.trim()) {
      setError('Company name is required')
      return
    }
    onComplete({
      ...details,
      email: user?.email || details.email
    })
  }

  // Step 0: Welcome Screen
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 overflow-hidden transition-opacity duration-500 ease-in-out">
        <div className="flex flex-col items-center justify-center gap-8 px-6 animate-in fade-in duration-700">
          {/* Logo */}
          <img 
            src="/Icons/Cutwise for pdf main.svg" 
            alt="Cutwise" 
            className="h-20 w-auto animate-in fade-in slide-in-from-top-4 duration-700"
          />
          
          {/* Animation */}
          <div className="w-[400px] h-[400px] flex items-center justify-center animate-in fade-in zoom-in-50 duration-700 delay-200">
            <LottieLoader 
              message=""
              size={400}
              animationPath="/animations/Rocket in Space.json"
              overlay={false}
            />
          </div>
          
          {/* Welcome Text */}
          <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Welcome to Cutwise
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Transform your IFC models into optimized cutting plans. 
              Generate nesting reports, reduce waste, and streamline your steel fabrication workflow.
            </p>
          </div>
          
          {/* Button */}
          <Button 
            onClick={() => setStep(1)}
            size="lg"
            className="px-12 py-6 text-lg font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500"
          >
            Let's start
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 transition-all duration-500 ease-in-out">
      <div className="w-full max-w-2xl px-6 animate-in fade-in slide-in-from-right-8 duration-500">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/Icons/Cutwise for pdf main.svg" 
            alt="Cutwise" 
            className="h-16 mx-auto mb-8"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell Us About Yourself</h2>
          <p className="text-gray-600">Help us personalize your experience</p>
        </div>

        {/* Form - No Card Border */}
        <div className="rounded-lg p-8">
          <div className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                type="text"
                value={details.companyName}
                onChange={(e) => setDetails({ ...details, companyName: e.target.value })}
                placeholder="Enter your company name"
                autoFocus
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Address <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="address"
                type="text"
                value={details.address}
                onChange={(e) => setDetails({ ...details, address: e.target.value })}
                placeholder="Enter your address"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Country <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="country"
                type="text"
                value={details.country}
                onChange={(e) => setDetails({ ...details, country: e.target.value })}
                placeholder="Enter your country"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={details.phoneNumber}
                onChange={(e) => setDetails({ ...details, phoneNumber: e.target.value })}
                placeholder="Enter your phone number"
              />
            </div>

            {/* Company Size */}
            <div className="space-y-2">
              <Label htmlFor="companySize" className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Company Size <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Select
                value={details.companySize}
                onValueChange={(value) => setDetails({ ...details, companySize: value as CompanyDetails['companySize'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Just me (1)</SelectItem>
                  <SelectItem value="1-10">Small team (1-10)</SelectItem>
                  <SelectItem value="10-50">Medium (10-50)</SelectItem>
                  <SelectItem value="50-300">Large (50-300)</SelectItem>
                  <SelectItem value="300+">Enterprise (300+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {error}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
            <Button
              type="button"
              onClick={handleComplete}
            >
              Complete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
