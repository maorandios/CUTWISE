import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CreditCard, X } from 'lucide-react'
import { PayPalCheckout } from './PayPalCheckout'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  credits?: number
}

export function PaymentModal({ isOpen, onClose, credits = 0 }: PaymentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0A5048]/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-[#0A5048]" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Purchase Credits</DialogTitle>
                <DialogDescription>
                  {credits === 0 
                    ? "You've run out of credits. Purchase more to continue using Cutwise."
                    : `You have ${credits} credit${credits === 1 ? '' : 's'} remaining.`
                  }
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Credit Balance Alert */}
          {credits === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>No credits remaining.</strong> You need at least 1 credit to generate a nesting report.
              </p>
            </div>
          )}

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Single Use */}
            <div className="border rounded-lg p-6 space-y-4 hover:border-[#0A5048] transition-colors">
              <div>
                <h4 className="font-semibold text-lg">Single Use</h4>
                <p className="text-sm text-muted-foreground">Perfect for one-time projects</p>
              </div>
              <div>
                <div className="text-3xl font-bold">€29</div>
                <p className="text-sm text-muted-foreground">1 credit</p>
              </div>
              <PayPalCheckout 
                planType="single" 
                credits={1} 
                amount={29.00}
                onSuccess={onClose}
              />
            </div>

            {/* 20 Pack - Popular */}
            <div className="border-2 border-[#0A5048] rounded-lg p-6 space-y-4 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A5048] text-white px-3 py-1 rounded-full text-xs font-semibold">
                POPULAR
              </div>
              <div>
                <h4 className="font-semibold text-lg">20 Uses Pack</h4>
                <p className="text-sm text-muted-foreground">Best for regular users</p>
              </div>
              <div>
                <div className="text-3xl font-bold">€499</div>
                <p className="text-sm text-muted-foreground">20 credits</p>
                <p className="text-xs text-[#0A5048] font-semibold mt-1">Save 14% (€24.95/credit)</p>
              </div>
              <PayPalCheckout 
                planType="pack_20" 
                credits={20} 
                amount={499.00}
                onSuccess={onClose}
              />
            </div>

            {/* 50 Pack - Best Value */}
            <div className="border rounded-lg p-6 space-y-4 hover:border-[#0A5048] transition-colors relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                BEST VALUE
              </div>
              <div>
                <h4 className="font-semibold text-lg">50 Uses Pack</h4>
                <p className="text-sm text-muted-foreground">Maximum savings</p>
              </div>
              <div>
                <div className="text-3xl font-bold">€999</div>
                <p className="text-sm text-muted-foreground">50 credits</p>
                <p className="text-xs text-[#0A5048] font-semibold mt-1">Save 31% (€19.98/credit)</p>
              </div>
              <PayPalCheckout 
                planType="pack_50" 
                credits={50} 
                amount={999.00}
                onSuccess={onClose}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Each nesting report generation uses 1 credit. Your first use is free!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
