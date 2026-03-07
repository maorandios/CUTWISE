import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { ProjectData } from '../utils/projectStorage'
import type { SteelReport, NestingReport } from '../types'

export interface SupabaseProject {
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

export const useProjects = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    if (!user) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('date_modified', { ascending: false })

      if (error) throw error

      // Transform Supabase data to ProjectData format
      const transformedProjects: ProjectData[] = (data || []).map((p: SupabaseProject) => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        filename: p.filename,
        dateCreated: p.date_created,
        dateModified: p.date_modified,
        steelReport: p.steel_report,
        nestingReport: p.nesting_report,
        stats: {
          totalProfiles: p.total_profiles,
          totalTonnage: p.total_tonnage,
          stockBarsUsed: p.stock_bars_used,
          totalParts: p.total_parts,
          avgWastePercentage: p.avg_waste_percentage,
          totalWasteTonnage: p.total_waste_tonnage,
          totalWasteMeters: p.total_waste_meters
        },
        status: p.status
      }))

      setProjects(transformedProjects)
      setError(null)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [user])

  const createProject = async (
    name: string,
    filename: string,
    steelReport: SteelReport
  ): Promise<ProjectData | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    try {
      const newProject = {
        user_id: user.id,
        name,
        filename,
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        status: 'analyzed' as const,
        total_profiles: steelReport.profiles?.length || 0,
        total_tonnage: 0, // Will be calculated after nesting (selected profiles only)
        stock_bars_used: 0,
        total_parts: 0,
        avg_waste_percentage: 0,
        total_waste_tonnage: 0,
        total_waste_meters: 0,
        steel_report: steelReport,
        nesting_report: null
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single()

      if (error) throw error

      const transformedProject: ProjectData = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        filename: data.filename,
        dateCreated: data.date_created,
        dateModified: data.date_modified,
        steelReport: data.steel_report,
        nestingReport: data.nesting_report,
        stats: {
          totalProfiles: data.total_profiles,
          totalTonnage: data.total_tonnage,
          stockBarsUsed: data.stock_bars_used,
          totalParts: data.total_parts,
          avgWastePercentage: data.avg_waste_percentage,
          totalWasteTonnage: data.total_waste_tonnage,
          totalWasteMeters: data.total_waste_meters
        },
        status: data.status
      }

      await fetchProjects()
      return transformedProject
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
      return null
    }
  }

  const updateProject = async (
    projectId: string,
    updates: Partial<ProjectData>
  ): Promise<ProjectData | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    try {
      const supabaseUpdates: any = {
        date_modified: new Date().toISOString()
      }

      if (updates.name !== undefined) supabaseUpdates.name = updates.name
      if (updates.status !== undefined) supabaseUpdates.status = updates.status
      if (updates.steelReport !== undefined) supabaseUpdates.steel_report = updates.steelReport
      if (updates.nestingReport !== undefined) supabaseUpdates.nesting_report = updates.nestingReport
      
      if (updates.stats) {
        supabaseUpdates.total_profiles = updates.stats.totalProfiles
        supabaseUpdates.total_tonnage = updates.stats.totalTonnage
        supabaseUpdates.stock_bars_used = updates.stats.stockBarsUsed
        supabaseUpdates.total_parts = updates.stats.totalParts
        supabaseUpdates.avg_waste_percentage = updates.stats.avgWastePercentage
        supabaseUpdates.total_waste_tonnage = updates.stats.totalWasteTonnage
        supabaseUpdates.total_waste_meters = updates.stats.totalWasteMeters
      }

      const { data, error } = await supabase
        .from('projects')
        .update(supabaseUpdates)
        .eq('id', projectId)
        .select()
        .single()

      if (error) throw error

      const transformedProject: ProjectData = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        filename: data.filename,
        dateCreated: data.date_created,
        dateModified: data.date_modified,
        steelReport: data.steel_report,
        nestingReport: data.nesting_report,
        stats: {
          totalProfiles: data.total_profiles,
          totalTonnage: data.total_tonnage,
          stockBarsUsed: data.stock_bars_used,
          totalParts: data.total_parts,
          avgWastePercentage: data.avg_waste_percentage,
          totalWasteTonnage: data.total_waste_tonnage,
          totalWasteMeters: data.total_waste_meters
        },
        status: data.status
      }

      await fetchProjects()
      return transformedProject
    } catch (err) {
      console.error('Error updating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to update project')
      return null
    }
  }

  const deleteProject = async (projectId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      await fetchProjects()
      return true
    } catch (err) {
      console.error('Error deleting project:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      return false
    }
  }

  const getProject = async (projectId: string): Promise<ProjectData | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error

      const transformedProject: ProjectData = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        filename: data.filename,
        dateCreated: data.date_created,
        dateModified: data.date_modified,
        steelReport: data.steel_report,
        nestingReport: data.nesting_report,
        stats: {
          totalProfiles: data.total_profiles,
          totalTonnage: data.total_tonnage,
          stockBarsUsed: data.stock_bars_used,
          totalParts: data.total_parts,
          avgWastePercentage: data.avg_waste_percentage,
          totalWasteTonnage: data.total_waste_tonnage,
          totalWasteMeters: data.total_waste_meters
        },
        status: data.status
      }

      return transformedProject
    } catch (err) {
      console.error('Error fetching project:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
      return null
    }
  }

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProject
  }
}
