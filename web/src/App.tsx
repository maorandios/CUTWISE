import { useState, useEffect } from 'react'
import Login from './components/Login'
import Signup from './components/Signup'
import Onboarding from './components/Onboarding'
import ProjectsDashboard from './components/ProjectsDashboard'
import Settings from './components/Settings'
import { Button } from '@/components/ui/Button'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Toaster } from '@/components/ui/sonner'
import { LottieLoader } from './components/LottieLoader'

import UploadProjectModal from './components/UploadProjectModal'
import FileUpload from './components/FileUpload'
import IFCViewer from './components/IFCViewer'
import IFCViewerWebIFC from './components/IFCViewerWebIFC'
import SteelReports from './components/SteelReports'
import NestingReport from './components/NestingReport'
import Dashboard from './components/Dashboard'
import Shipment from './components/Shipment'
import Management from './components/Management'
import ProfilesTab from './components/ProfilesTab'
import PlatesTab from './components/PlatesTab'
import AssembliesTab from './components/AssembliesTab'
import BoltsTab from './components/BoltsTab'
import FastenersTab from './components/FastenersTab'
import PlateNestingTab from './components/PlateNestingTab'
import { SteelReport, FilterState, NestingReport as NestingReportType } from './types'
import * as ProjectStorage from './utils/projectStorage'
import type { CompanyDetails } from './utils/projectStorage'
import type { ProjectData } from './utils/projectStorage'
import { apiRequest } from './utils/api'
import { useAuth } from './hooks/useAuth'
import { useProjects } from './hooks/useProjects'
import { useCompany } from './hooks/useCompany'
import { toast } from 'sonner'
import { migrateLocalStorageToSupabase, hasLocalStorageData, clearLocalStorageAfterMigration } from './utils/migrateToSupabase'

function App() {
  // Supabase hooks
  const { user, loading: authLoading, signOut } = useAuth()
  const { projects, createProject, updateProject, deleteProject, getProject, fetchProjects } = useProjects()
  const { company, saveCompany } = useCompany()
  
  // Auth state
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [userName, setUserName] = useState('User')
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  
  // View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'split' | 'report' | 'settings'>('dashboard')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [dashboardRefresh, setDashboardRefresh] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  // Load from localStorage on mount (but NOT currentFile or nesting data - always start fresh)
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('ifc_viewer_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          // NOTE: currentFile, report, gltfPath, gltfAvailable are NOT loaded - always start fresh
          filters: parsed.filters ? {
            profileTypes: new Set<string>(parsed.filters.profileTypes || []),
            plateThicknesses: new Set<string>(parsed.filters.plateThicknesses || []),
            assemblyMarks: new Set<string>(parsed.filters.assemblyMarks || [])
          } : {
            profileTypes: new Set<string>(),
            plateThicknesses: new Set<string>(),
            assemblyMarks: new Set<string>()
          },
          activeTab: parsed.activeTab || 'model'
          // NOTE: nestingReport is NOT loaded from storage - always start fresh
        }
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e)
    }
    return null
  }

  const savedState = loadFromStorage()
  
  // Always start with no file - user must upload
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [report, setReport] = useState<SteelReport | null>(null)
  const [gltfPath, setGltfPath] = useState<string | undefined>(undefined)
  const [gltfAvailable, setGltfAvailable] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [modelReady, setModelReady] = useState(false)
  const [filters, setFilters] = useState<FilterState>(savedState?.filters || {
    profileTypes: new Set<string>(),
    plateThicknesses: new Set<string>(),
    assemblyMarks: new Set<string>()
  })
  const [activeTab, setActiveTab] = useState<'model' | 'ifcm' | 'nesting' | 'dashboard' | 'profiles' | 'plates' | 'assemblies' | 'bolts' | 'fasteners' | 'plate-nesting' | 'shipment' | 'management'>(savedState?.activeTab || 'ifcm')
  const [nestingReport, setNestingReport] = useState<NestingReportType | null>(null)  // Always start with null
  const [nestingSettingsHandler, setNestingSettingsHandler] = useState<(() => void) | null>(null)
  
  // Cache for tab data - loaded once and kept in memory
  const [tabDataCache, setTabDataCache] = useState<{
    profiles?: any[]
    plates?: any[]
    assemblies?: any[]
    bolts?: any[]
    fasteners?: any[]
    shipment?: any[]
    management?: any[]
    dashboardDetails?: any
  }>({})

  // Check authentication and set user display name
  useEffect(() => {
    if (user) {
      // Get display name from company or user metadata
      const displayName = company?.companyName || user.user_metadata?.full_name || user.email || 'User'
      setUserName(displayName)
      console.log('[App] User authenticated:', displayName)
      
      // Check if onboarding is needed (no company details)
      if (!company) {
        setNeedsOnboarding(true)
        console.log('[App] User needs onboarding')
      } else {
        setNeedsOnboarding(false)
      }

      // Check for localStorage data to migrate
      if (hasLocalStorageData()) {
        console.log('[App] Found localStorage data, prompting migration')
        toast.info('Would you like to migrate your existing projects to the cloud?', {
          duration: 10000,
          action: {
            label: 'Migrate',
            onClick: async () => {
              const result = await migrateLocalStorageToSupabase()
              if (result.success) {
                toast.success(`Successfully migrated ${result.migratedProjects} project(s)`)
                clearLocalStorageAfterMigration()
                await fetchProjects()
                setDashboardRefresh(prev => prev + 1)
              } else {
                toast.error(`Migration completed with errors: ${result.errors.join(', ')}`)
              }
            }
          }
        })
      }
    }
  }, [user, company])

  // Save to localStorage whenever state changes (but only save filters and activeTab, not file data)
  useEffect(() => {
    try {
      const stateToSave = {
        // NOTE: currentFile, report, gltfPath, gltfAvailable are NOT saved - always start fresh
        filters: {
          profileTypes: Array.from(filters.profileTypes),
          plateThicknesses: Array.from(filters.plateThicknesses),
          assemblyMarks: Array.from(filters.assemblyMarks)
        },
        activeTab
        // NOTE: nestingReport is NOT saved - always start fresh
      }
      localStorage.setItem('ifc_viewer_state', JSON.stringify(stateToSave))
    } catch (e) {
      console.error('Error saving to localStorage:', e)
    }
  }, [filters, activeTab])

  const handleFileUploaded = async (filename: string, reportData: SteelReport, gltfPath?: string, gltfAvailable?: boolean) => {
    // Always clear nesting report when new file is uploaded
    setNestingReport(null)
    
    setCurrentFile(filename)
    setReport(reportData)
    setGltfPath(gltfPath)
    setGltfAvailable(gltfAvailable || false)
    // Reset filters when new file is uploaded
    setFilters({
      profileTypes: new Set(),
      plateThicknesses: new Set(),
      assemblyMarks: new Set()
    })
    setActiveTab('ifcm')  // Open IFCM viewer after upload
    
    // Clear tab data cache when new file is uploaded
    setTabDataCache({})

    // Save project to Supabase
    const project = await createProject(filename, filename, reportData)
    if (project) {
      setCurrentProjectId(project.id)
      toast.success('Project created successfully')
    } else {
      toast.error('Failed to save project')
    }

    // Close modal and switch to split screen view
    setShowUploadModal(false)
    setCurrentView('split')
  }
  
  const handleUploadWithName = async (projectName: string, file: File) => {
    setLoading(true)
    setUploadProgress(0)
    setModelReady(false)
    setLoadingMessage('Uploading IFC file')

    // Close modal immediately so Lottie loader is visible
    setShowUploadModal(false)

    try {
      // Upload file to backend
      const formData = new FormData()
      formData.append('file', file)

      // Smooth progress: 0-20% for upload
      setUploadProgress(5)
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadProgress(10)
      setLoadingMessage('Uploading IFC file')

      const response = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      setUploadProgress(20)
      await new Promise(resolve => setTimeout(resolve, 100))
      setLoadingMessage('Analyzing IFC file')

      const data = await response.json()

      // Smooth progress: 20-50% for analysis
      setUploadProgress(30)
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadProgress(40)
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadProgress(50)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create project with custom name
      setNestingReport(null)
      setCurrentFile(data.filename)
      setReport(data.report)
      setGltfPath(data.gltf_path)
      setGltfAvailable(data.gltf_available || false)
      setFilters({
        profileTypes: new Set(),
        plateThicknesses: new Set(),
        assemblyMarks: new Set()
      })
      setActiveTab('ifcm')
      setTabDataCache({})

      // Create project with custom name in Supabase
      const project = await createProject(projectName, data.filename, data.report)
      if (project) {
        setCurrentProjectId(project.id)
      } else {
        toast.error('Failed to save project')
      }

      setUploadProgress(60)
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadProgress(70)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Switch to split screen to trigger model loading (but loading overlay stays visible)
      setCurrentView('split')
      
      setUploadProgress(75)
      setLoadingMessage('Analyzing IFC file')
      
      // Wait for model ready signal with timeout
      const maxWaitTime = 30000 // 30 seconds max
      const startWaitTime = Date.now()
      const startProgress = 75
      const endProgress = 95
      
      while (!modelReady && (Date.now() - startWaitTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 200))
        // Gradually increase progress
        const elapsed = Date.now() - startWaitTime
        const progressIncrease = (endProgress - startProgress) * (elapsed / maxWaitTime)
        setUploadProgress(Math.min(endProgress, startProgress + progressIncrease))
      }

      setUploadProgress(98)
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadProgress(100)
      setLoadingMessage('Ready!')
      
      // Small delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 300))
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file. Please try again.')
      setShowUploadModal(true) // Reopen modal on error
      setCurrentView('dashboard')
    } finally {
      setLoading(false)
      setLoadingMessage('')
      setUploadProgress(0)
      setModelReady(false)
    }
  }

  const handleNestingReportChange = async (report: NestingReportType | null) => {
    console.log('[App] handleNestingReportChange called:', {
      hasReport: !!report,
      currentProjectId: currentProjectId,
      profilesCount: report?.profiles?.length || 0
    })
    
    setNestingReport(report)

    // Update project with nesting data and switch to report view
    if (report && currentProjectId) {
      // Get existing project to access steel report for weight calculations
      const existingProject = await getProject(currentProjectId)
      if (!existingProject) {
        toast.error('Failed to load project data')
        return
      }

      // Calculate nesting stats
      const stockBarsUsed = report.profiles.reduce(
        (sum, profile) => sum + profile.cutting_patterns.length,
        0
      )
      
      let totalWasteMeters = 0
      let totalWasteTonnage = 0
      let totalTonnage = 0 // Weight of selected profiles only
      
      report.profiles.forEach(profile => {
        // Sum waste from all cutting patterns
        const wasteForProfile = profile.cutting_patterns.reduce((sum, pattern) => {
          return sum + (pattern.waste || 0)
        }, 0)
        
        // Convert waste from mm to meters
        totalWasteMeters += wasteForProfile / 1000.0
        
        // Calculate waste tonnage and total tonnage using steel report data
        const steelProfile = existingProject.steelReport?.profiles?.find(
          p => p.profile_name === profile.profile_name
        )
        
        if (steelProfile) {
          // Add weight of this profile to total tonnage (kg to tonnes)
          totalTonnage += steelProfile.total_weight / 1000.0
          
          if (profile.total_length > 0) {
            // weight_per_meter = total_weight_kg / (total_length_mm / 1000)
            const totalLengthM = profile.total_length / 1000.0
            const weightPerMeter = steelProfile.total_weight / totalLengthM
            const wasteM = wasteForProfile / 1000.0
            totalWasteTonnage += (wasteM * weightPerMeter) / 1000.0
          }
        }
      })

      const updatedProject = await updateProject(currentProjectId, {
        nestingReport: report,
        stats: {
          totalProfiles: report.summary.total_profiles,
          totalTonnage: totalTonnage, // Weight from selected profiles only
          stockBarsUsed: stockBarsUsed,
          totalParts: report.summary.total_parts,
          avgWastePercentage: report.summary.avg_waste_percentage,
          totalWasteTonnage: totalWasteTonnage,
          totalWasteMeters: totalWasteMeters
        },
        status: 'nested'
      })
      
      console.log('[App] Updated project in database:', {
        success: !!updatedProject,
        hasNesting: !!updatedProject?.nestingReport
      })
      if (updatedProject) {
        setCurrentView('report')
      } else {
        toast.error('Failed to save nesting report')
      }
    }
  }

  // Auth handlers
  const handleLoginSuccess = () => {
    console.log('[App] Login successful')
    // User state will be updated by useAuth hook
    // Check if onboarding needed will be handled by useEffect
  }

  const handleSignupSuccess = () => {
    console.log('[App] Signup successful')
    // User state will be updated by useAuth hook
    // Will trigger onboarding check in useEffect
  }
  
  const handleOnboardingComplete = async (details: CompanyDetails) => {
    const success = await saveCompany(details)
    if (success) {
      setNeedsOnboarding(false)
      setCurrentView('dashboard')
      setUserName(details.companyName)
      toast.success('Company details saved successfully')
      console.log('[App] Onboarding completed')
    } else {
      toast.error('Failed to save company details')
    }
  }

  const handleLogout = async () => {
    await signOut()
    setCurrentView('dashboard')
    setCurrentFile(null)
    setReport(null)
    setNestingReport(null)
    toast.success('Logged out successfully')
  }
  
  const handleSelectProject = async (projectData: ProjectData) => {
    console.log('[App] handleSelectProject called with:', {
      id: projectData.id,
      name: projectData.name,
      hasNestingInParam: !!projectData.nestingReport
    })

    // Load complete project data from Supabase
    const fullProject = await getProject(projectData.id)
    
    if (fullProject) {
      console.log('[App] Loaded project from storage:', {
        name: fullProject.name,
        hasReport: !!fullProject.steelReport,
        hasNesting: !!fullProject.nestingReport,
        nestingProfiles: fullProject.nestingReport?.profiles?.length || 0
      })
      
      setCurrentFile(fullProject.filename)
      setReport(fullProject.steelReport)
      setNestingReport(fullProject.nestingReport)
      setCurrentProjectId(fullProject.id)
      
      // Navigate based on whether nesting report exists
      console.log('[App] About to check navigation:', {
        hasNestingReport: !!fullProject.nestingReport,
        nestingReportType: typeof fullProject.nestingReport,
        willGoTo: fullProject.nestingReport ? 'REPORT' : 'SPLIT'
      })
      
      if (fullProject.nestingReport) {
        console.log('[App] ✅ Navigating to REPORT view')
        setCurrentView('report') // Go directly to nesting report
      } else {
        console.log('[App] ❌ Navigating to SPLIT view (no nesting)')
        setCurrentView('split') // Go to split screen to generate nesting
      }
      
      console.log('[App] currentView set to:', fullProject.nestingReport ? 'report' : 'split')
    } else {
      console.error('[App] Project not found:', projectData.id)
    }
  }
  
  const handleUploadNew = () => {
    setShowUploadModal(true)
  }
  
  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setCurrentFile(null)
    setReport(null)
    setNestingReport(null)
    setCurrentProjectId(null)
    setDashboardRefresh(prev => prev + 1) // Trigger dashboard reload
  }
  
  const handleGenerateNewReport = () => {
    // Go to split screen to regenerate nesting
    setCurrentView('split')
  }

  const handleOpenSettings = () => {
    setCurrentView('settings')
  }

  // REMOVED: Tab preloading (was causing 23s delay)
  // Data is now loaded on-demand when each tab is opened
  // This saves ~23 seconds on file upload and only loads what's needed

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LottieLoader
          message="Loading..."
          animationPath="/animations/Abstract Isometric Loader.json"
          size={300}
        />
      </div>
    )
  }

  // Show auth screens if not authenticated
  if (!user) {
    if (authView === 'login') {
      return (
        <>
          <Login onLoginSuccess={handleLoginSuccess} onSwitchToSignup={() => setAuthView('signup')} />
          <Toaster position="top-right" />
        </>
      )
    } else {
      return (
        <>
          <Signup onSignupSuccess={handleSignupSuccess} onSwitchToLogin={() => setAuthView('login')} />
          <Toaster position="top-right" />
        </>
      )
    }
  }
  
  // Show onboarding if user just signed up and hasn't completed it
  if (needsOnboarding) {
    return (
      <>
        <Onboarding onComplete={handleOnboardingComplete} />
        <Toaster position="top-right" />
      </>
    )
  }

  // Show settings view
  if (currentView === 'settings') {
    return (
      <>
        <Settings
          onBack={handleBackToDashboard}
          onLogout={handleLogout}
          companyDetails={ProjectStorage.getCompanyDetails() || {
            companyName: '',
            address: '',
            country: '',
            phoneNumber: '',
            companySize: '',
            email: ''
          }}
          onSaveCompanyDetails={(details) => {
            ProjectStorage.saveCompanyDetails(details)
          }}
        />
        {loading && (
          <LottieLoader 
            message={loadingMessage} 
            animationPath="/animations/Abstract Isometric Loader.json"
            size={600}
            showProgress={true}
            progress={uploadProgress}
          />
        )}
        <Toaster position="top-right" />
      </>
    )
  }

  // Show dashboard view
  if (currentView === 'dashboard') {
    return (
      <>
        <ProjectsDashboard
          onSelectProject={handleSelectProject}
          onUploadNew={handleUploadNew}
          onLogout={handleLogout}
          userName={userName}
          refreshTrigger={dashboardRefresh}
          onOpenSettings={handleOpenSettings}
        />
        <UploadProjectModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadWithName}
          loading={loading}
        />
        {loading && (
          <LottieLoader 
            message={loadingMessage} 
            animationPath="/animations/Abstract Isometric Loader.json"
            size={600}
            showProgress={true}
            progress={uploadProgress}
          />
        )}
        <Toaster position="top-right" />
      </>
    )
  }

  // Show split screen view (model + profile list)
  if (currentView === 'split') {
    return (
      <>
        <div className="h-screen flex flex-col overflow-hidden">
          <Header
            onLogout={handleLogout}
            showBackButton={true}
            onBackClick={handleBackToDashboard}
            title={currentFile?.replace('.ifc', '') || 'Project'}
            showNestingSettings={false}
            onNestingSettingsClick={nestingSettingsHandler || undefined}
          />
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {currentFile && (
              <>
                <div className="flex-1 overflow-hidden">
                  <NestingReport 
                    key={`split-${currentFile}`}
                    filename={currentFile} 
                    nestingReport={nestingReport}
                    onNestingReportChange={handleNestingReportChange}
                    report={report}
                    initialView="select"
                    onSettingsClick={(handler) => setNestingSettingsHandler(() => handler)}
                    onModelReady={() => setModelReady(true)}
                  />
                </div>
                <Footer />
              </>
            )}

            {!currentFile && (
              <div className="flex items-center justify-center text-gray-500 py-20">
                <p>Loading project...</p>
              </div>
            )}
          </div>
        </div>
        {loading && (
          <LottieLoader 
            message={loadingMessage} 
            animationPath="/animations/Abstract Isometric Loader.json"
            size={600}
            showProgress={true}
            progress={uploadProgress}
          />
        )}
        <Toaster position="top-right" />
      </>
    )
  }

  // Show report view (nesting report only)
  if (currentView === 'report') {
    return (
      <>
        <div className="h-screen flex flex-col overflow-hidden">
          <Header
            onLogout={handleLogout}
            showBackButton={true}
            onBackClick={handleBackToDashboard}
            title={currentFile?.replace('.ifc', '') || 'Project'}
            showNestingSettings={false}
            onNestingSettingsClick={nestingSettingsHandler || undefined}
          />
          
          <div className="flex-1 overflow-y-auto">
            {currentFile && nestingReport && (
              <div className="min-h-full flex flex-col">
                <div className="flex-1">
                  <NestingReport 
                    key={`report-${currentFile}`}
                    filename={currentFile} 
                    nestingReport={nestingReport}
                    onNestingReportChange={handleNestingReportChange}
                    report={report}
                    initialView="results"
                    onSettingsClick={(handler) => setNestingSettingsHandler(() => handler)}
                  />
                </div>
                <Footer />
              </div>
            )}

            {!currentFile && (
              <div className="flex items-center justify-center text-gray-500 py-20">
                <p>Loading project...</p>
              </div>
            )}
          </div>
        </div>
        {loading && <LottieLoader message={loadingMessage} size={250} />}
        <Toaster position="top-right" />
      </>
    )
  }

  // Fallback - should not reach here
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {currentFile && (
          <>
            {/* Tab Navigation - HIDDEN */}
            {false && (
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'dashboard'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Dashboard
                  </button>
                  {/* GLTF Model tab - DISABLED (code preserved for future use) */}
                  {false && (
                    <button
                      onClick={() => setActiveTab('model')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'model'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Model (GLTF)
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('ifcm')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'ifcm'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Model
                  </button>
                  <button
                    onClick={() => setActiveTab('profiles')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'profiles'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Profiles
                  </button>
                  <button
                    onClick={() => setActiveTab('plates')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'plates'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Plates
                  </button>
                  <button
                    onClick={() => setActiveTab('assemblies')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'assemblies'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Assemblies
                  </button>
                  <button
                    onClick={() => setActiveTab('bolts')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'bolts'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Bolts
                  </button>
                  <button
                    onClick={() => setActiveTab('fasteners')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'fasteners'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Fasteners
                  </button>
                  <button
                    onClick={() => setActiveTab('plate-nesting')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'plate-nesting'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Plate Nesting
                  </button>
                  <button
                    onClick={() => setActiveTab('nesting')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'nesting'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Nesting
                  </button>
                  <button
                    onClick={() => setActiveTab('shipment')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'shipment'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Shipment
                  </button>
                  <button
                    onClick={() => setActiveTab('management')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'management'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Management
                  </button>
                </div>
              </div>
            )}

          {/* Main Content - Nesting View Only */}
          <div className="min-h-full flex flex-col">
            <div className="flex-1">
              <NestingReport 
                filename={currentFile} 
                nestingReport={nestingReport}
                onNestingReportChange={handleNestingReportChange}
                report={report}
              />
            </div>
            <Footer />
          </div>
        </>
      )}

      {!currentFile && (
        <div className="flex items-center justify-center text-gray-500 py-20">
          <p>Loading project...</p>
        </div>
      )}
    </div>
  </div>
  )
}

export default App

