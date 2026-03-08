import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
})

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          name: string
          address?: string | null
          country?: string | null
          phone_number?: string | null
          company_size?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string | null
          country?: string | null
          phone_number?: string | null
          company_size?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          filename: string
          date_created: string
          date_modified: string
          status: 'uploaded' | 'analyzed' | 'nested' | 'completed'
          total_profiles: number
          total_tonnage: number
          stock_bars_used: number
          total_parts: number
          avg_waste_percentage: number
          total_waste_tonnage: number
          total_waste_meters: number
          steel_report: any
          nesting_report: any
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          filename: string
          date_created?: string
          date_modified?: string
          status?: 'uploaded' | 'analyzed' | 'nested' | 'completed'
          total_profiles?: number
          total_tonnage?: number
          stock_bars_used?: number
          total_parts?: number
          avg_waste_percentage?: number
          total_waste_tonnage?: number
          total_waste_meters?: number
          steel_report?: any
          nesting_report?: any
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          filename?: string
          date_created?: string
          date_modified?: string
          status?: 'uploaded' | 'analyzed' | 'nested' | 'completed'
          total_profiles?: number
          total_tonnage?: number
          stock_bars_used?: number
          total_parts?: number
          avg_waste_percentage?: number
          total_waste_tonnage?: number
          total_waste_meters?: number
          steel_report?: any
          nesting_report?: any
        }
      }
    }
  }
}
