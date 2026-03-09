import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

interface Payment {
  id: string
  amount: number
  currency: string
  credits_purchased: number
  plan_type: string
  status: string
  created_at: string
  completed_at: string | null
}

interface UsageHistory {
  id: string
  project_name: string
  action: string
  credits_used: number
  created_at: string
}

export function useCredits() {
  const { user } = useAuth()
  const [credits, setCredits] = useState<number>(0)
  const [totalCreditsPurchased, setTotalCreditsPurchased] = useState<number>(0)
  const [payments, setPayments] = useState<Payment[]>([])
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch credits and company data
  const fetchCredits = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('credits, total_credits_purchased')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setCredits(data.credits || 0)
        setTotalCreditsPurchased(data.total_credits_purchased || 0)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
      toast.error('Failed to fetch credit balance')
    } finally {
      setLoading(false)
    }
  }

  // Fetch payment history
  const fetchPayments = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  // Fetch usage history
  const fetchUsageHistory = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('usage_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setUsageHistory(data || [])
    } catch (error) {
      console.error('Error fetching usage history:', error)
    }
  }

  // Check if user has credits
  const hasCredits = (): boolean => {
    return credits > 0
  }

  // Deduct a credit (call after successful nesting report generation)
  const deductCredit = async (projectId: string, projectName: string): Promise<boolean> => {
    if (!user) return false

    try {
      // Call the Supabase function to deduct credit
      const { data, error } = await supabase.rpc('deduct_credit', {
        p_user_id: user.id,
        p_project_id: projectId,
        p_project_name: projectName
      })

      if (error) throw error

      if (data === true) {
        // Update local state
        setCredits(prev => Math.max(0, prev - 1))
        toast.success('Credit used successfully')
        
        // Refresh usage history
        await fetchUsageHistory()
        return true
      } else {
        toast.error('Insufficient credits')
        return false
      }
    } catch (error) {
      console.error('Error deducting credit:', error)
      toast.error('Failed to deduct credit')
      return false
    }
  }

  // Add credits after successful payment
  const addCredits = async (creditsToAdd: number, paymentId: string): Promise<boolean> => {
    if (!user) return false

    try {
      // Call the Supabase function to add credits
      const { data, error } = await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_credits: creditsToAdd,
        p_payment_id: paymentId
      })

      if (error) throw error

      if (data === true) {
        // Update local state
        setCredits(prev => prev + creditsToAdd)
        setTotalCreditsPurchased(prev => prev + creditsToAdd)
        toast.success(`${creditsToAdd} credits added to your account!`)
        
        // Refresh payment history
        await fetchPayments()
        return true
      } else {
        toast.error('Failed to add credits')
        return false
      }
    } catch (error) {
      console.error('Error adding credits:', error)
      toast.error('Failed to add credits')
      return false
    }
  }

  // Record payment in database
  const recordPayment = async (
    amount: number,
    currency: string,
    creditsPurchased: number,
    planType: string,
    paypalOrderId: string,
    paypalTransactionId: string,
    paypalPayerEmail: string,
    companyId: string | null
  ): Promise<string | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          company_id: companyId || null,
          amount,
          currency,
          credits_purchased: creditsPurchased,
          plan_type: planType,
          paypal_order_id: paypalOrderId,
          paypal_transaction_id: paypalTransactionId,
          paypal_payer_email: paypalPayerEmail,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) throw error

      return data?.id || null
    } catch (error) {
      console.error('Error recording payment:', error)
      return null
    }
  }

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchCredits()
      fetchPayments()
      fetchUsageHistory()
    }
  }, [user])

  // Subscribe to credits changes
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCredits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return {
    credits,
    totalCreditsPurchased,
    payments,
    usageHistory,
    loading,
    hasCredits,
    deductCredit,
    addCredits,
    recordPayment,
    refreshCredits: fetchCredits,
    refreshPayments: fetchPayments,
    refreshUsageHistory: fetchUsageHistory
  }
}
