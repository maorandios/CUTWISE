import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface NestingBottomNavProps {
  currentStep: number // 1, 2, or 3
  onBack?: () => void
  onContinue: () => void
  continueDisabled?: boolean
  continueText?: string
  backText?: string
  showBack?: boolean
}

export const NestingBottomNav = ({
  currentStep,
  onBack,
  onContinue,
  continueDisabled = false,
  continueText = 'Continue',
  backText = 'Back',
  showBack = true
}: NestingBottomNavProps) => {
  const steps = [
    { number: 1, title: 'Profile Selection' },
    { number: 2, title: 'Select Parts' },
    { number: 3, title: 'Stock Configuration' }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          {showBack && onBack ? (
            <Button
              variant="outline"
              onClick={onBack}
              size="lg"
              className="min-w-[120px]"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {backText}
            </Button>
          ) : (
            <div className="min-w-[120px]"></div>
          )}

          {/* Progress Bar (Centered) */}
          <div className="flex items-center gap-3">
            {steps.map((step, index) => {
              const isCompleted = step.number < currentStep
              const isCurrent = step.number === currentStep
              const isPending = step.number > currentStep

              return (
                <div key={step.number} className="flex items-center">
                  {/* Step Circle and Title */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-base
                        transition-all duration-300
                        ${isCompleted ? 'bg-primary text-white' : ''}
                        ${isCurrent ? 'bg-primary text-white ring-4 ring-primary/20' : ''}
                        ${isPending ? 'bg-gray-200 text-gray-500' : ''}
                      `}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    
                    {/* Title */}
                    <div
                      className={`
                        mt-2 text-xs font-medium text-center whitespace-nowrap
                        ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'}
                      `}
                    >
                      {step.title}
                    </div>
                  </div>

                  {/* Connecting Line (don't show after last step) */}
                  {index < steps.length - 1 && (
                    <div className="w-16 h-1 mx-3" style={{ marginBottom: '32px' }}>
                      <div className="absolute h-1 w-16 bg-gray-200 rounded-full"></div>
                      <div
                        className={`
                          absolute h-1 rounded-full transition-all duration-500
                          ${step.number < currentStep ? 'bg-primary w-16' : 'bg-gray-200 w-0'}
                        `}
                      ></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Continue Button */}
          <Button
            onClick={onContinue}
            disabled={continueDisabled}
            size="lg"
            className="min-w-[120px]"
          >
            {continueText}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
