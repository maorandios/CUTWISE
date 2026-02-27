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
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`}></div>
          </div>
        </div>

        {/* Onboarding Card */}
        <Card>
          <CardContent className="pt-8">
          {/* Step 1: Company Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Company Information</h3>
                <p className="text-gray-600 text-sm">Tell us about your company</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">
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

              <div className="space-y-2">
                <Label htmlFor="address">
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

              <div className="space-y-2">
                <Label htmlFor="country">
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

              {error && (
                <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
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

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
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

              <div className="space-y-2">
                <Label htmlFor="companySize">
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
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
            <div className="flex gap-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}
              <Button
                type="button"
                onClick={handleNext}
              >
                {step === 2 ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Step Indicator Text */}
        <div className="text-center mt-4 text-sm text-gray-500">
          Step {step} of 2
        </div>
      </div>
    </div>
  )
}

export default Onboarding
