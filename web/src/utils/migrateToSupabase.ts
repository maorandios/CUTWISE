import * as ProjectStorage from './projectStorage'
import { supabase } from '../lib/supabase'
import type { ProjectData, CompanyDetails } from './projectStorage'

export interface MigrationResult {
  success: boolean
  migratedProjects: number
  migratedCompany: boolean
  errors: string[]
}

export const migrateLocalStorageToSupabase = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    migratedProjects: 0,
    migratedCompany: false,
    errors: []
  }

  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      result.errors.push('User not authenticated')
      return result
    }

    console.log('[Migration] Starting migration for user:', user.id)

    // Migrate company details
    const companyDetails = ProjectStorage.getCompanyDetails()
    if (companyDetails) {
      try {
        const { error } = await supabase
          .from('companies')
          .upsert([{
            user_id: user.id,
            name: companyDetails.companyName,
            address: companyDetails.address,
            country: companyDetails.country,
            phone_number: companyDetails.phoneNumber,
            company_size: companyDetails.companySize,
            email: companyDetails.email || user.email
          }])

        if (error) {
          result.errors.push(`Company migration failed: ${error.message}`)
        } else {
          result.migratedCompany = true
          console.log('[Migration] Company details migrated successfully')
        }
      } catch (err) {
        result.errors.push(`Company migration error: ${err}`)
      }
    }

    // Migrate projects
    const localProjects = ProjectStorage.getAllProjects()
    console.log(`[Migration] Found ${localProjects.length} projects in localStorage`)

    for (const project of localProjects) {
      try {
        // Check if project already exists in Supabase
        const { data: existing } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', user.id)
          .eq('filename', project.filename)
          .single()

        if (existing) {
          console.log(`[Migration] Project ${project.name} already exists, skipping`)
          continue
        }

        // Insert project into Supabase
        const { error } = await supabase
          .from('projects')
          .insert([{
            user_id: user.id,
            name: project.name,
            filename: project.filename,
            date_created: project.dateCreated,
            date_modified: project.dateModified,
            status: project.status,
            total_profiles: project.stats.totalProfiles,
            total_tonnage: project.stats.totalTonnage,
            stock_bars_used: project.stats.stockBarsUsed,
            total_parts: project.stats.totalParts,
            avg_waste_percentage: project.stats.avgWastePercentage,
            total_waste_tonnage: project.stats.totalWasteTonnage,
            total_waste_meters: project.stats.totalWasteMeters,
            steel_report: project.steelReport,
            nesting_report: project.nestingReport
          }])

        if (error) {
          result.errors.push(`Failed to migrate project ${project.name}: ${error.message}`)
        } else {
          result.migratedProjects++
          console.log(`[Migration] Migrated project: ${project.name}`)
        }
      } catch (err) {
        result.errors.push(`Error migrating project ${project.name}: ${err}`)
      }
    }

    result.success = result.errors.length === 0
    console.log('[Migration] Migration complete:', result)
    return result
  } catch (err) {
    result.errors.push(`Migration failed: ${err}`)
    return result
  }
}

export const hasLocalStorageData = (): boolean => {
  const projects = ProjectStorage.getAllProjects()
  const company = ProjectStorage.getCompanyDetails()
  return projects.length > 0 || !!company
}

export const clearLocalStorageAfterMigration = () => {
  try {
    localStorage.removeItem('cutwise_projects')
    localStorage.removeItem('cutwise_company_details')
    localStorage.removeItem('cutwise_current_user')
    console.log('[Migration] Cleared localStorage data')
  } catch (err) {
    console.error('[Migration] Error clearing localStorage:', err)
  }
}
