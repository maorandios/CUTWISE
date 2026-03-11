import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { useCredits } from '../hooks/useCredits'
import { useCompany } from '../hooks/useCompany'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { getBackendUrl } from '../utils/api'

interface PayPalCheckoutProps {
  planType: string
  credits: number
  amount: number
  onSuccess?: () => void
  onError?: () => void
}

export function PayPalCheckout({ planType, credits, amount, onSuccess, onError }: PayPalCheckoutProps) {
  const { user } = useAuth()
  const { recordPayment, addCredits } = useCredits()
  const { company } = useCompany()
  const [userLocale, setUserLocale] = useState<string>('en_GB') // Default to Europe (UK)
  const [isDetectingLocation, setIsDetectingLocation] = useState(true)
  const [isLoadingCardForm, setIsLoadingCardForm] = useState(false)
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null)

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

  // Detect user's country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        console.log('[PayPal] Starting country detection...')
        let detectedCountry = null
        
        // Try ipapi.co first (most reliable)
        try {
          console.log('[PayPal] Trying ipapi.co...')
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          
          const response = await fetch('https://ipapi.co/json/', {
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          
          const data = await response.json()
          console.log('[PayPal] ipapi.co response:', data)
          
          if (data.country_code) {
            detectedCountry = data.country_code
            console.log('[PayPal] ✓ Country detected from ipapi.co:', data.country_code, `(${data.country_name})`)
          } else if (data.error) {
            console.log('[PayPal] ipapi.co error:', data.reason)
          }
        } catch (e: any) {
          console.log('[PayPal] ipapi.co failed:', e.message)
        }
        
        // Fallback to ipify + ipapi.com
        if (!detectedCountry) {
          try {
            console.log('[PayPal] Trying ipapi.com...')
            const response = await fetch('https://ipapi.com/ip_api.php?ip=', {
              mode: 'cors'
            })
            const data = await response.json()
            console.log('[PayPal] ipapi.com response:', data)
            
            if (data.country_code) {
              detectedCountry = data.country_code
              console.log('[PayPal] ✓ Country detected from ipapi.com:', data.country_code)
            }
          } catch (e: any) {
            console.log('[PayPal] ipapi.com failed:', e.message)
          }
        }
        
        // Last fallback: cloudflare trace
        if (!detectedCountry) {
          try {
            console.log('[PayPal] Trying cloudflare trace...')
            const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace')
            const text = await response.text()
            const locMatch = text.match(/loc=([A-Z]{2})/)
            if (locMatch) {
              detectedCountry = locMatch[1]
              console.log('[PayPal] ✓ Country detected from cloudflare:', detectedCountry)
            }
          } catch (e: any) {
            console.log('[PayPal] cloudflare failed:', e.message)
          }
        }
        
        if (detectedCountry) {
          setDetectedCountry(detectedCountry)
          
          // Map country codes to PayPal locales (all in English)
          const countryToLocale: { [key: string]: string } = {
            'IL': 'en_US', // Israel - English
            'US': 'en_US', // United States
            'GB': 'en_GB', // United Kingdom
            'DE': 'en_US', // Germany - English
            'FR': 'en_US', // France - English
            'ES': 'en_US', // Spain - English
            'IT': 'en_US', // Italy - English
            'NL': 'en_US', // Netherlands - English
            'CA': 'en_CA', // Canada
            'AU': 'en_AU', // Australia
          }
          
          const locale = countryToLocale[detectedCountry] || 'en_US'
          console.log('[PayPal] ✓ Final locale set to:', locale, 'for country:', detectedCountry)
          setUserLocale(locale)
        } else {
          console.log('[PayPal] ⚠ Could not detect country, using default: en_GB')
        }
      } catch (error) {
        console.error('[PayPal] ❌ Country detection error:', error)
        setUserLocale('en_GB') // Default to Europe (UK)
      } finally {
        setIsDetectingLocation(false)
      }
    }

    detectCountry()
  }, [])

  if (!clientId) {
    return (
      <div className="text-red-500 text-sm">
        PayPal is not configured. Please contact support.
      </div>
    )
  }

  if (isDetectingLocation) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-sm text-gray-600">Detecting location...</span>
      </div>
    )
  }

  const createOrder = async () => {
    try {
      console.log('[PayPal] Creating order for plan:', planType)
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token')
      }

      console.log('[PayPal] Making request to backend...')
      const response = await fetch(`${getBackendUrl()}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_type: planType })
      })

      console.log('[PayPal] Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[PayPal] Error response:', errorText)
        throw new Error(`Failed to create order: ${errorText}`)
      }

      const data = await response.json()
      console.log('[PayPal] Order created:', data.order_id)
      return data.order_id
    } catch (error) {
      console.error('[PayPal] Error creating order:', error)
      toast.error('Failed to create payment order')
      throw error
    }
  }

  const onApprove = async (data: any) => {
    try {
      console.log('[PayPal] Payment approved, capturing order:', data.orderID)
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${getBackendUrl()}/api/payments/capture-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ order_id: data.orderID })
      })

      console.log('[PayPal] Capture response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[PayPal] Capture error:', errorText)
        throw new Error(`Failed to capture order: ${errorText}`)
      }

      const captureData = await response.json()
      console.log('[PayPal] Capture successful:', captureData)

      if (captureData.success) {
        // Record payment in database
        const paymentId = await recordPayment(
          amount,
          'EUR',
          credits,
          planType,
          data.orderID,
          captureData.transaction_id,
          data.payer?.email_address || '',
          company?.id || null
        )

        if (paymentId) {
          // Add credits to user account
          await addCredits(credits, paymentId)
          toast.success(`Payment successful! ${credits} credits added to your account.`)
          onSuccess?.()
        } else {
          throw new Error('Failed to record payment')
        }
      } else {
        throw new Error('Payment capture failed')
      }
    } catch (error) {
      console.error('[PayPal] Error capturing order:', error)
      toast.error('Payment processing failed. Please contact support.')
      onError?.()
    }
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'EUR',
        intent: 'capture',
        locale: userLocale,
        'disable-funding': 'paylater,venmo' // Disable unnecessary payment methods
      }}
    >
      <div className="max-w-md mx-auto">
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 38
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={(err) => {
            console.error('PayPal error:', err)
            toast.error('Payment failed. Please try again.')
            setIsLoadingCardForm(false)
            onError?.()
          }}
          onInit={(data, actions) => {
            console.log('[PayPal] Buttons initialized with locale:', userLocale)
          }}
          onClick={(data, actions) => {
            console.log('[PayPal] Button clicked, funding source:', data.fundingSource)
            // Show loading state when card button is clicked
            if (data.fundingSource === 'card') {
              console.log('[PayPal] Card button clicked - showing loader')
              setIsLoadingCardForm(true)
              // Hide loader after 2.5 seconds (card form should be visible by then)
              setTimeout(() => {
                console.log('[PayPal] Hiding loader')
                setIsLoadingCardForm(false)
              }, 2500)
            }
            return actions.resolve()
          }}
          onCancel={() => {
            console.log('[PayPal] Payment cancelled')
            setIsLoadingCardForm(false)
          }}
        />
        
        {isLoadingCardForm && (
          <div className="flex items-center justify-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-gray-900"></div>
              <span className="text-sm font-medium text-gray-700">Loading payment form...</span>
            </div>
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  )
}
