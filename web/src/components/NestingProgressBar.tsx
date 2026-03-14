import { Check } from 'lucide-react'

interface Step {
  number: number
  title: string
}

interface NestingProgressBarProps {
  currentStep: number // 1, 2, or 3
}

export const NestingProgressBar = ({ currentStep }: NestingProgressBarProps) => {
  const steps: Step[] = [
    { number: 1, title: 'Profile Selection' },
    { number: 2, title: 'Select Parts' },
    { number: 3, title: 'Stock Configuration' }
  ]

  return (
    <div className="w-full py-4 bg-gray-50">
      <div className="max-w-2xl mx-auto px-6">
        <div className="flex items-center justify-between relative">
          {steps.map((step, index) => {
            const isCompleted = step.number < currentStep
            const isCurrent = step.number === currentStep
            const isPending = step.number > currentStep

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step Circle and Title */}
                <div className="flex flex-col items-center relative z-10">
                  {/* Circle */}
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
                  <div className="flex-1 h-1 mx-3 relative" style={{ top: '-16px' }}>
                    <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                    <div
                      className={`
                        absolute inset-0 rounded-full transition-all duration-500
                        ${step.number < currentStep ? 'bg-primary w-full' : 'bg-gray-200 w-0'}
                      `}
                    ></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
