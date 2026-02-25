import { SteelReport, NestingReport as NestingReportType } from '../types'

// Database-ready project structure
export interface ProjectData {
  id: string
  userId?: string // For future database integration
  name: string
  filename: string
  dateCreated: string
  dateModified: string
  
  // IFC Analysis Data
  steelReport: SteelReport | null
  
  // Nesting Data
  nestingReport: NestingReportType | null
  
  // Computed Stats (for quick display)
  stats: {
    totalProfiles: number
    totalTonnage: number
    stockBarsUsed: number
    totalParts: number
    avgWastePercentage: number
  }
  
  // Status
  status: 'uploaded' | 'analyzed' | 'nested' | 'completed'
}

// Storage keys
const PROJECTS_KEY = 'cutwise_projects'
const CURRENT_USER_KEY = 'cutwise_current_user'
const COMPANY_DETAILS_KEY = 'cutwise_company_details'

// Company details interface
export interface CompanyDetails {
  companyName: string
  address: string
  country: string
  phoneNumber: string
  companySize: '1' | '1-10' | '10-50' | '50-300' | '300+' | ''
}

/**
 * Migrate old project format to new format
 */
const migrateOldProject = (oldProject: any): ProjectData => {
  // If already in new format, return as is
  if (oldProject.stats && oldProject.status) {
    return oldProject as ProjectData
  }
  
  // Migrate old format
  return {
    id: oldProject.id || `project_${Date.now()}`,
    name: oldProject.name || 'Untitled Project',
    filename: oldProject.filename || 'unknown.ifc',
    dateCreated: oldProject.dateCreated || new Date().toISOString(),
    dateModified: oldProject.dateModified || oldProject.dateCreated || new Date().toISOString(),
    steelReport: oldProject.steelReport || null,
    nestingReport: oldProject.nestingReport || null,
    stats: {
      totalProfiles: oldProject.totalProfiles || 0,
      totalTonnage: oldProject.totalTonnage || 0,
      stockBarsUsed: oldProject.stockBarsUsed || 0,
      totalParts: 0,
      avgWastePercentage: 0
    },
    status: 'analyzed'
  }
}

/**
 * Get all projects for current user
 */
export const getAllProjects = (): ProjectData[] => {
  try {
    const data = localStorage.getItem(PROJECTS_KEY)
    if (!data) return []
    
    const rawProjects = JSON.parse(data) as any[]
    
    // Migrate old projects to new format
    const projects = rawProjects.map(migrateOldProject)
    
    // Save migrated projects back
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    
    // Filter by current user if needed (for future multi-user support)
    return projects.sort((a, b) => 
      new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    )
  } catch (e) {
    console.error('Error loading projects:', e)
    return []
  }
}

/**
 * Get a single project by ID
 */
export const getProject = (projectId: string): ProjectData | null => {
  try {
    const projects = getAllProjects()
    return projects.find(p => p.id === projectId) || null
  } catch (e) {
    console.error('Error loading project:', e)
    return null
  }
}

/**
 * Create a new project
 */
export const createProject = (
  filename: string,
  steelReport: SteelReport
): ProjectData => {
  const now = new Date().toISOString()
  
  const project: ProjectData = {
    id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: filename.replace('.ifc', ''),
    filename: filename,
    dateCreated: now,
    dateModified: now,
    steelReport: steelReport,
    nestingReport: null,
    stats: {
      totalProfiles: steelReport.profiles?.length || 0,
      totalTonnage: steelReport.total_tonnage || 0,
      stockBarsUsed: 0,
      totalParts: 0,
      avgWastePercentage: 0
    },
    status: 'analyzed'
  }
  
  // Save to storage
  const projects = getAllProjects()
  projects.unshift(project) // Add to beginning
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  
  console.log('[ProjectStorage] Created project:', project.id)
  return project
}

/**
 * Update an existing project
 */
export const updateProject = (
  projectId: string,
  updates: Partial<Omit<ProjectData, 'id' | 'dateCreated'>>
): ProjectData | null => {
  try {
    const projects = getAllProjects()
    const index = projects.findIndex(p => p.id === projectId)
    
    if (index === -1) {
      console.error('[ProjectStorage] Project not found:', projectId)
      return null
    }
    
    // Update project
    projects[index] = {
      ...projects[index],
      ...updates,
      dateModified: new Date().toISOString()
    }
    
    // Save to storage
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    
    console.log('[ProjectStorage] Updated project:', projectId)
    return projects[index]
  } catch (e) {
    console.error('Error updating project:', e)
    return null
  }
}

/**
 * Update project with nesting report
 */
export const updateProjectNesting = (
  projectId: string,
  nestingReport: NestingReportType
): ProjectData | null => {
  const stockBarsUsed = nestingReport.profiles.reduce(
    (sum, profile) => sum + profile.cutting_patterns.length,
    0
  )
  
  return updateProject(projectId, {
    nestingReport: nestingReport,
    stats: {
      totalProfiles: nestingReport.summary.total_profiles,
      totalTonnage: 0, // Keep from steelReport
      stockBarsUsed: stockBarsUsed,
      totalParts: nestingReport.summary.total_parts,
      avgWastePercentage: nestingReport.summary.avg_waste_percentage
    },
    status: 'nested'
  })
}

/**
 * Delete a project
 */
export const deleteProject = (projectId: string): boolean => {
  try {
    const projects = getAllProjects()
    const filtered = projects.filter(p => p.id !== projectId)
    
    if (filtered.length === projects.length) {
      console.error('[ProjectStorage] Project not found:', projectId)
      return false
    }
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered))
    console.log('[ProjectStorage] Deleted project:', projectId)
    return true
  } catch (e) {
    console.error('Error deleting project:', e)
    return false
  }
}

/**
 * Clear all projects (for testing)
 */
export const clearAllProjects = (): void => {
  localStorage.removeItem(PROJECTS_KEY)
  console.log('[ProjectStorage] Cleared all projects')
}

/**
 * Export project data (for future database migration)
 */
export const exportProjectData = (): string => {
  const projects = getAllProjects()
  return JSON.stringify(projects, null, 2)
}

/**
 * Import project data (for future database migration)
 */
export const importProjectData = (jsonData: string): boolean => {
  try {
    const projects = JSON.parse(jsonData) as ProjectData[]
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    console.log('[ProjectStorage] Imported', projects.length, 'projects')
    return true
  } catch (e) {
    console.error('Error importing projects:', e)
    return false
  }
}

// User management (placeholder for future auth integration)
export const setCurrentUser = (userId: string, userName: string): void => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ userId, userName }))
}

export const getCurrentUser = (): { userId: string; userName: string } | null => {
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export const clearCurrentUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY)
}

// Company details management
export const saveCompanyDetails = (details: CompanyDetails): void => {
  localStorage.setItem(COMPANY_DETAILS_KEY, JSON.stringify(details))
  console.log('[CompanyStorage] Saved company details')
}

export const getCompanyDetails = (): CompanyDetails | null => {
  try {
    const data = localStorage.getItem(COMPANY_DETAILS_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export const hasCompletedOnboarding = (): boolean => {
  const details = getCompanyDetails()
  return !!details && !!details.companyName
}
