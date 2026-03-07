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

  const fetchCompany = async () => {
    if (!user) {
      setCompany(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setCompany(null)
          setError(null)
        } else {
          throw error
        }
      } else {
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
      }
    } catch (err) {
      console.error('Error fetching company:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch company')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompany()
  }, [user])

  const saveCompany = async (details: CompanyDetails): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

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

      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existing) {
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([companyData])

        if (error) throw error
      }

      await fetchCompany()
      return true
    } catch (err) {
      console.error('Error saving company:', err)
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
