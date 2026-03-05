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

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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
  const [filters, setFilters] = useState<FilterState>(savedState?.filters || {
    profileTypes: new Set<string>(),
    plateThicknesses: new Set<string>(),
    assemblyMarks: new Set<string>()
  })
  const [activeTab, setActiveTab] = useState<'model' | 'ifcm' | 'nesting' | 'dashboard' | 'profiles' | 'plates' | 'assemblies' | 'bolts' | 'fasteners' | 'plate-nesting' | 'shipment' | 'management'>(savedState?.activeTab || 'ifcm')
  const [nestingReport, setNestingReport] = useState<NestingReportType | null>(null)  // Always start with null
  
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

  // Check for existing user session on mount
  useEffect(() => {
    const user = ProjectStorage.getCurrentUser()
    if (user) {
      setUserName(user.userName)
      setIsAuthenticated(true)
      console.log('[App] Restored user session:', user.userName)
      
      // Check if onboarding is needed
      const hasOnboarded = ProjectStorage.hasCompletedOnboarding()
      if (!hasOnboarded) {
        setNeedsOnboarding(true)
        console.log('[App] User needs onboarding')
      }
    }
  }, [])

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

  const handleFileUploaded = (filename: string, reportData: SteelReport, gltfPath?: string, gltfAvailable?: boolean) => {
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
    
    // Save project with full data using new storage system
    const project = ProjectStorage.createProject(filename, reportData)
    setCurrentProjectId(project.id)
    
    // Close modal and switch to split screen view
    setShowUploadModal(false)
    setCurrentView('split')
  }
  
  const handleUploadWithName = async (projectName: string, file: File) => {
    const startTime = Date.now()
    setLoading(true)
    setLoadingMessage('Uploading and processing project...')

    // Close modal immediately so Lottie loader is visible
    setShowUploadModal(false)

    try {
      // Upload file to backend
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

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

      // Create project with custom name
      const project = ProjectStorage.createProject(data.filename, data.report)
      // Update project name to custom name
      ProjectStorage.updateProject(project.id, { name: projectName })
      setCurrentProjectId(project.id)

      // Ensure minimum 3 seconds display time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      setCurrentView('split')
      
    } catch (error) {
      console.error('Upload error:', error)
      
      // Ensure minimum 3 seconds display time even on error
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      alert('Failed to upload file. Please try again.')
      setShowUploadModal(true) // Reopen modal on error
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const handleNestingReportChange = (report: NestingReportType | null) => {
    console.log('[App] handleNestingReportChange called:', {
      hasReport: !!report,
      currentProjectId: currentProjectId,
      profilesCount: report?.profiles?.length || 0
    })
    
    setNestingReport(report)
    
    // Update project with nesting data and switch to report view
    if (report && currentProjectId) {
      const updatedProject = ProjectStorage.updateProjectNesting(currentProjectId, report)
      console.log('[App] Updated project in storage:', {
        success: !!updatedProject,
        hasNesting: !!updatedProject?.nestingReport
      })
      setCurrentView('report') // Navigate to report view after generation
    }
  }

  // Auth handlers
  const handleLogin = (username: string, password: string) => {
    // TODO: Implement actual authentication with backend
    console.log('Login:', username, password)
    
    // For now, just set user in localStorage
    const userId = `user_${Date.now()}`
    ProjectStorage.setCurrentUser(userId, username)
    
    setUserName(username)
    setIsAuthenticated(true)
    setCurrentView('dashboard')
  }

  const handleSignup = (fullName: string, email: string, password: string) => {
    // TODO: Implement actual signup with backend
    console.log('Signup:', fullName, email, password)
    
    // For now, just set user in localStorage with email
    const userId = `user_${Date.now()}`
    ProjectStorage.setCurrentUser(userId, fullName, email)
    
    setUserName(fullName)
    setIsAuthenticated(true)
    
    // Check if user needs onboarding (first time signup)
    const hasOnboarded = ProjectStorage.hasCompletedOnboarding()
    if (!hasOnboarded) {
      setNeedsOnboarding(true)
    } else {
      setCurrentView('dashboard')
    }
  }
  
  const handleOnboardingComplete = (details: CompanyDetails) => {
    ProjectStorage.saveCompanyDetails(details)
    setNeedsOnboarding(false)
    setCurrentView('dashboard')
    console.log('[App] Onboarding completed')
  }
  
  const handleLogout = () => {
    ProjectStorage.clearCurrentUser()
    setIsAuthenticated(false)
    setCurrentView('dashboard')
    setCurrentFile(null)
    setReport(null)
    setNestingReport(null)
  }
  
  const handleSelectProject = (projectData: ProjectData) => {
    console.log('[App] handleSelectProject called with:', {
      id: projectData.id,
      name: projectData.name,
      hasNestingInParam: !!projectData.nestingReport
    })
    
    // Load complete project data from storage
    const fullProject = ProjectStorage.getProject(projectData.id)
    
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

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    if (authView === 'login') {
      return (
        <>
          <Login onLogin={handleLogin} onSwitchToSignup={() => setAuthView('signup')} />
          <Toaster position="top-right" />
        </>
      )
    } else {
      return (
        <>
          <Signup onSignup={handleSignup} onSwitchToLogin={() => setAuthView('login')} />
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
        {loading && <LottieLoader message={loadingMessage} size={250} />}
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
        {loading && <LottieLoader message={loadingMessage} size={250} />}
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
          />
          
          <div className="flex-1 overflow-y-auto">
            {currentFile && (
              <div className="min-h-full flex flex-col">
                <div className="flex-1">
                  <NestingReport 
                    key={`split-${currentFile}`}
                    filename={currentFile} 
                    nestingReport={nestingReport}
                    onNestingReportChange={handleNestingReportChange}
                    report={report}
                    initialView="select"
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

