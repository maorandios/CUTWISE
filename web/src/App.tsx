import { useState, useEffect } from 'react'
import Login from './components/Login'
import Signup from './components/Signup'
import ProjectsDashboard from './components/ProjectsDashboard'
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
import type { ProjectData } from './utils/projectStorage'

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [userName, setUserName] = useState('User')
  
  // View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'upload' | 'project'>('dashboard')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  
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
    
    // Switch to project view
    setCurrentView('project')
  }

  const handleNestingReportChange = (report: NestingReportType | null) => {
    setNestingReport(report)
    
    // Update project with nesting data
    if (report && currentProjectId) {
      ProjectStorage.updateProjectNesting(currentProjectId, report)
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
    
    // For now, just set user in localStorage
    const userId = `user_${Date.now()}`
    ProjectStorage.setCurrentUser(userId, fullName)
    
    setUserName(fullName)
    setIsAuthenticated(true)
    setCurrentView('dashboard')
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
    // Load complete project data from storage
    const fullProject = ProjectStorage.getProject(projectData.id)
    
    if (fullProject) {
      setCurrentFile(fullProject.filename)
      setReport(fullProject.steelReport)
      setNestingReport(fullProject.nestingReport)
      setCurrentProjectId(fullProject.id)
      setCurrentView('project')
      
      console.log('[App] Loaded project:', fullProject.name, {
        hasReport: !!fullProject.steelReport,
        hasNesting: !!fullProject.nestingReport,
        status: fullProject.status
      })
    } else {
      console.error('[App] Project not found:', projectData.id)
    }
  }
  
  const handleUploadNew = () => {
    setCurrentView('upload')
  }
  
  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setCurrentFile(null)
    setReport(null)
    setNestingReport(null)
  }

  // REMOVED: Tab preloading (was causing 23s delay)
  // Data is now loaded on-demand when each tab is opened
  // This saves ~23 seconds on file upload and only loads what's needed

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    if (authView === 'login') {
      return <Login onLogin={handleLogin} onSwitchToSignup={() => setAuthView('signup')} />
    } else {
      return <Signup onSignup={handleSignup} onSwitchToLogin={() => setAuthView('login')} />
    }
  }

  // Show dashboard view
  if (currentView === 'dashboard') {
    return (
      <ProjectsDashboard
        onSelectProject={handleSelectProject}
        onUploadNew={handleUploadNew}
        onLogout={handleLogout}
        userName={userName}
      />
    )
  }

  // Show upload view
  if (currentView === 'upload') {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to dashboard"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img 
                src="/Icons/cutwise - logo.svg" 
                alt="Cutwise" 
                className="h-8"
              />
              <h1 className="text-xl font-bold text-gray-900">Upload New Project</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Log Out
            </button>
          </div>
        </header>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <FileUpload 
              onUpload={handleFileUploaded}
              loading={loading}
              setLoading={setLoading}
            />
          </div>

          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Upload an IFC file to get started</p>
          </div>
        </div>
      </div>
    )
  }

  // Show project view (nesting report)
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to dashboard"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <img 
              src="/Icons/cutwise - logo.svg" 
              alt="Cutwise" 
              className="h-8"
            />
            <h1 className="text-xl font-bold text-gray-900">{currentFile?.replace('.ifc', '') || 'Project'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUploadNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Upload New
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col overflow-hidden">
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
          <div className="flex-1 overflow-hidden">
            <NestingReport 
              filename={currentFile} 
              nestingReport={nestingReport}
              onNestingReportChange={handleNestingReportChange}
              report={report}
            />
          </div>
        </>
      )}

      {!currentFile && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Loading project...</p>
        </div>
      )}
    </div>
  </div>
  )
}

export default App

