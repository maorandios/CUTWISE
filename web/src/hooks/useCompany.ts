import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { CompanyDetails } from '../utils/projectStorage'

export interface SupabaseCompany {
  id: string
  user_id: string
  name: string
  address: string | null
  country: string | null
  phone_number: string | null
  company_size: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export const useCompany = () => {
  const { user } = useAuth()
  const [company, setCompany] = useState<CompanyDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)

  const fetchCompany = async (force: boolean = false) => {
    if (!user) {
      setCompany(null)
      setLoading(false)
      return
    }

    // Skip loading if already loaded and not forced
    if (hasInitiallyLoaded && !force) {
      console.log('[useCompany] Company already loaded, skipping fetch')
      return
    }

    try {
      setLoading(true)
      console.log('[useCompany] Fetching company for user:', user.id)
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log('[useCompany] Fetch result:', { data, error })

      if (error) {
        console.error('[useCompany] Fetch error:', error)
        throw error
      }
      
      if (data) {
        const transformedCompany: CompanyDetails = {
          companyName: data.name,
          address: data.address || '',
          country: data.country || '',
          phoneNumber: data.phone_number || '',
          companySize: (data.company_size || '') as CompanyDetails['companySize'],
          email: data.email || ''
        }
        setCompany(transformedCompany)
        setError(null)
        console.log('[useCompany] Company loaded:', transformedCompany)
      } else {
        setCompany(null)
        setError(null)
        console.log('[useCompany] No company found for user')
      }
      setHasInitiallyLoaded(true)
    } catch (err) {
      console.error('[useCompany] Error fetching company:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch company')
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && !hasInitiallyLoaded) {
      console.log('[useCompany] Initial fetch for user:', user.id)
      fetchCompany()
    }
  }, [user])
  
  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      setHasInitiallyLoaded(false)
      setCompany(null)
      setLoading(false)
    }
  }, [user])

  const saveCompany = async (details: CompanyDetails): Promise<boolean> => {
    if (!user) {
      console.error('[useCompany] Cannot save - user not authenticated')
      setError('User not authenticated')
      return false
    }

    console.log('[useCompany] Saving company details:', details)

    try {
      const companyData = {
        user_id: user.id,
        name: details.companyName,
        address: details.address,
        country: details.country,
        phone_number: details.phoneNumber,
        company_size: details.companySize,
        email: details.email
      }

      console.log('[useCompany] Company data to save:', companyData)

      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        console.log('[useCompany] Updating existing company:', existing.id)
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('user_id', user.id)

        if (error) {
          console.error('[useCompany] Update error:', error)
          throw error
        }
        console.log('[useCompany] Company updated successfully')
      } else {
        console.log('[useCompany] Inserting new company')
        const { error } = await supabase
          .from('companies')
          .insert([{
            ...companyData,
            credits: 1,  // Start with 1 free credit
            total_credits_purchased: 0
          }])

        if (error) {
          console.error('[useCompany] Insert error:', error)
          throw error
        }
        console.log('[useCompany] Company inserted successfully with 1 free credit')
      }

      await fetchCompany(true) // Force reload after save
      console.log('[useCompany] Company refetched after save')
      return true
    } catch (err) {
      console.error('[useCompany] Error saving company:', err)
      setError(err instanceof Error ? err.message : 'Failed to save company')
      return false
    }
  }

  return {
    company,
    loading,
    error,
    fetchCompany,
    saveCompany
  }
}
