import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NestingBottomNavProps {
  onBack?: () => void
  onContinue: () => void
  continueDisabled?: boolean
  continueText?: string
  backText?: string
  showBack?: boolean
}

export const NestingBottomNav = ({
  onBack,
  onContinue,
  continueDisabled = false,
  continueText = 'Continue',
  backText = 'Back',
  showBack = true
}: NestingBottomNavProps) => {
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
            <div></div> // Empty div to maintain space
          )}

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
