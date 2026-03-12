import { useState, useEffect } from 'react'
import Login from './components/Login'
import Signup from './components/Signup'
import Onboarding from './components/Onboarding'
import VerificationSuccess from './components/VerificationSuccess'
import ProjectsDashboard from './components/ProjectsDashboard'
import Settings from './components/Settings'
import { Button } from '@/components/ui/Button'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Toaster } from '@/components/ui/sonner'
import { LottieLoader } from './components/LottieLoader'

import UploadProjectModal from './components/UploadProjectModal'
import { PaymentModal } from './components/PaymentModal'
import { WelcomeModal } from './components/WelcomeModal'
import IFCValidationModal from './components/IFCValidationModal'
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
import { useCredits } from './hooks/useCredits'
import { toast } from 'sonner'

function App() {
  // Supabase hooks
  const { user, loading: authLoading, signOut } = useAuth()
  const { projects, createProject, updateProject, deleteProject, getProject, fetchProjects } = useProjects()
  const { company, loading: companyLoading, saveCompany } = useCompany()
  const { credits, hasCredits, deductCredit, refreshCredits } = useCredits()
  
  // Auth state
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [userName, setUserName] = useState('User')
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [isNewSignup, setIsNewSignup] = useState(false)
  const [showLoginLoadingScreen, setShowLoginLoadingScreen] = useState(false)
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false)
  const [isFromEmailVerification, setIsFromEmailVerification] = useState(false)
  const [isProcessingVerification, setIsProcessingVerification] = useState(false)
  
  // View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'split' | 'report' | 'settings'>('dashboard')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string>('')
  const [dashboardRefresh, setDashboardRefresh] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [pendingUpload, setPendingUpload] = useState<{ projectName: string; file: File } | null>(null)
  
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

  // Detect if user came from email verification link (NEW TAB) or Google signup
  useEffect(() => {
    const hash = window.location.hash
    const isWaitingTab = sessionStorage.getItem('cutwise_is_waiting_tab') === 'true'
    const wasGoogleSignup = sessionStorage.getItem('cutwise_google_signup') === 'true'

    console.log('[App] Hash check - hash:', hash.substring(0, 50), 'isWaitingTab:', isWaitingTab, 'wasGoogleSignup:', wasGoogleSignup)

    // Check for Google signup
    if (wasGoogleSignup) {
      console.log('[App] Detected Google signup - setting isNewSignup!')
      setIsNewSignup(true)
      sessionStorage.removeItem('cutwise_google_signup')
    }

    if (hash.includes('access_token') && hash.includes('type=signup')) {
      if (!isWaitingTab) {
        // NEW TAB from email link - show loading while Supabase processes
        console.log('[App] NEW TAB from email - processing verification, setting isNewSignup!')
        setIsProcessingVerification(true)
        setIsNewSignup(true)
        // Store in sessionStorage to persist across re-renders
        sessionStorage.setItem('cutwise_is_new_signup', 'true')
      } else {
        console.log('[App] WAITING TAB - EmailVerification component will handle it')
      }
    }
  }, [])

  // Check authentication and set user display name
  useEffect(() => {
    if (user) {
      // Get display name from company or user metadata
      const displayName = company?.companyName || user.user_metadata?.full_name || user.email || 'User'
      setUserName(displayName)
      console.log('[App] User authenticated:', displayName)
      console.log('[App] Company loading:', companyLoading, 'Company exists:', !!company, 'Has checked:', hasCheckedOnboarding, 'isNewSignup:', isNewSignup, 'showLoadingScreen:', showLoginLoadingScreen)
      
      // Stop processing verification once user is authenticated (with minimum 2 second delay)
      if (isProcessingVerification) {
        console.log('[App] Verification complete - user authenticated! Waiting 2 seconds...')
        
        // Restore isNewSignup from sessionStorage if it was set
        const wasNewSignup = sessionStorage.getItem('cutwise_is_new_signup') === 'true'
        if (wasNewSignup && !isNewSignup) {
          console.log('[App] Restoring isNewSignup from sessionStorage!')
          setIsNewSignup(true)
        }
        
        // Wait at least 2 seconds before hiding the arrows animation
        setTimeout(() => {
          console.log('[App] 2 seconds elapsed, stopping verification screen')
          setIsProcessingVerification(false)
        }, 2000)
      }
      
      // Check onboarding after company data has finished loading AND loading screen is done
      if (!companyLoading && !showLoginLoadingScreen) {
        if (!hasCheckedOnboarding) {
          setHasCheckedOnboarding(true)
        }
        
        // If user has no company, they need onboarding AND should see welcome screen
        // BUT don't show onboarding if this is the verification success screen
        if (!company && !isFromEmailVerification) {
          setNeedsOnboarding(true)
          // Always show welcome screen if user has no company (never completed onboarding)
          if (!isNewSignup) {
            console.log('[App] User has no company - setting isNewSignup to show welcome screen')
            setIsNewSignup(true)
          }
          console.log('[App] User needs onboarding (no company details)')
        } else if (company) {
          setNeedsOnboarding(false)
          console.log('[App] User has company details, skipping onboarding')
        }
      }
    } else {
      // Reset when user logs out (but don't reset isNewSignup if we're processing verification)
      setHasCheckedOnboarding(false)
      setNeedsOnboarding(false)
      if (!isProcessingVerification) {
        setIsNewSignup(false)
      }
    }
  }, [user, company, companyLoading, hasCheckedOnboarding, isNewSignup, showLoginLoadingScreen, isFromEmailVerification, isProcessingVerification])
  
  // Handle login loading screen with minimum 4 seconds
  useEffect(() => {
    if (showLoginLoadingScreen) {
      console.log('[App] Loading screen is active, setting 4 second timer')
      const timer = setTimeout(() => {
        console.log('[App] 4 seconds elapsed, clearing loading screen')
        setShowLoginLoadingScreen(false)
      }, 4000)
      
      return () => {
        console.log('[App] Cleaning up timer')
        clearTimeout(timer)
      }
    }
  }, [showLoginLoadingScreen])
  
  // Trigger loading screen on login
  useEffect(() => {
    if (user && !authLoading && !isNewSignup && !hasCheckedOnboarding && !isProcessingVerification) {
      // User just logged in (not a new signup) - show loading screen immediately
      console.log('[App] User logged in, showing loading screen')
      setShowLoginLoadingScreen(true)
    }
  }, [user, authLoading, isNewSignup, hasCheckedOnboarding, isProcessingVerification])

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
    // First, validate the IFC file
    setLoading(true)
    setLoadingMessage('Validating IFC file...')
    setUploadProgress(0)
    
    try {
      const { validateIFC } = await import('./utils/api')
      const validation = await validateIFC(file)
      
      setLoading(false)
      
      // If validation fails, show warning modal
      if (!validation.is_valid) {
        setShowUploadModal(false) // Close upload modal
        setValidationResult(validation)
        setShowValidationModal(true)
        setPendingUpload({ projectName, file })
        return
      }
      
      // If validation passes, proceed with upload
      await proceedWithUpload(projectName, file)
      
    } catch (error) {
      console.error('Validation error:', error)
      toast.error('Failed to validate IFC file')
      setLoading(false)
      setShowUploadModal(true)
    }
  }

  const proceedWithUpload = async (projectName: string, file: File) => {
    setLoading(true)
    setUploadProgress(0)
    setModelReady(false)
    setLoadingMessage('Uploading IFC file')

    // Close modals
    setShowUploadModal(false)
    setShowValidationModal(false)

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
        setCurrentProjectName(projectName) // Store the custom project name
        
        // Deduct credit after successful file upload
        await deductCredit(project.id, projectName)
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
    setIsNewSignup(false) // Existing user logging in
    // User state will be updated by useAuth hook
  }

  const handleSignupSuccess = () => {
    console.log('[App] Signup successful')
    setIsNewSignup(true) // New user signing up - needs onboarding
    // User state will be updated by useAuth hook
    // Will trigger onboarding check in useEffect
  }
  
  const handleOnboardingComplete = async (details: CompanyDetails) => {
    console.log('[App] handleOnboardingComplete called with:', details)
    
    // Show loading screen immediately to prevent dashboard flash
    setShowLoginLoadingScreen(true)
    
    // Initialize default technical settings for new users
    const defaultSettings = {
      kerf: 3.0,
      trim: 5.0,
      toleranceEnabled: true,
      tolerance: 10.0,
      stockLengths: [
        { id: 1, value: 6000 },
        { id: 2, value: 12000 }
      ]
    }
    localStorage.setItem('cutwise_nesting_settings', JSON.stringify(defaultSettings))
    console.log('[App] Default technical settings initialized:', defaultSettings)
    
    const success = await saveCompany(details)
    console.log('[App] saveCompany result:', success)

    if (success) {
      setNeedsOnboarding(false)
      setCurrentView('dashboard')
      setUserName(details.companyName)

      // Refresh credits immediately after company creation
      await refreshCredits()
      console.log('[App] Credits refreshed after company creation')
      
      // Show loading screen for new signups after onboarding (only from onboarding)
      setShowLoginLoadingScreen(true)
      setTimeout(() => {
        setShowLoginLoadingScreen(false)
        setIsNewSignup(false)
        // Show welcome modal after loading screen
        setShowWelcomeModal(true)
      }, 4000)
      
      toast.success('Company details saved successfully')
      console.log('[App] Onboarding completed successfully')
    } else {
      toast.error('Failed to save company details')
      console.error('[App] Onboarding failed to save')
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
      setCurrentProjectName(fullProject.name) // Store the project name
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
    // Check if user has credits
    if (!hasCredits()) {
      setShowPaymentModal(true)
      toast.error('You need credits to upload a new project')
      return
    }
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

  // Check if this is the waiting tab that got verified - keep it on success screen
  const isWaitingTabVerified = sessionStorage.getItem('cutwise_waiting_tab_verified') === 'true'
  
  if (isWaitingTabVerified && !company) {
    console.log('[App] This is the WAITING TAB that got verified - keeping on success screen')
    // Keep showing Signup component which will display EmailVerification success
    return (
      <>
        <Signup onSignupSuccess={handleSignupSuccess} onSwitchToLogin={() => setAuthView('login')} />
        <Toaster position="top-right" />
      </>
    )
  }

  // Show loading while processing email verification (NEW TAB)
  console.log('[App] Render check - isProcessingVerification:', isProcessingVerification, 'user:', !!user, 'authView:', authView)
  
  if (isProcessingVerification) {
    console.log('[App] Processing verification - showing loading screen')
    return (
      <>
        <div className="fixed inset-0 bg-gray-50 flex items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center gap-6">
            <LottieLoader 
              message=""
              size={125}
              animationPath="/animations/Arrows icon.json"
              overlay={false}
            />
            <p className="text-gray-700 text-xl font-medium">Redirecting you to Cutwise!</p>
          </div>
        </div>
        <Toaster position="top-right" />
      </>
    )
  }
  
  // Show auth screens if not authenticated (including during initial auth check)
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
  
  // Show loading screen overlay only when explicitly triggered (not on page refresh)
  if (showLoginLoadingScreen) {
    return (
      <>
        <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-[9999]">
          <div className="flex flex-col items-center gap-6">
            <LottieLoader 
              message=""
              size={400}
              animationPath="/animations/Rocket in Space.json"
              overlay={false}
            />
            <p className="text-gray-700 text-xl font-medium">We are setting things up</p>
          </div>
        </div>
        <Toaster position="top-right" />
      </>
    )
  }
  
  // Show onboarding if user just signed up and hasn't completed it
  if (needsOnboarding) {
    console.log('[App] Rendering Onboarding - showWelcome:', isNewSignup, 'isFromEmailVerification:', isFromEmailVerification)
    return (
      <>
        <Onboarding onComplete={handleOnboardingComplete} showWelcome={isNewSignup} />
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
          companyDetails={company || {
            companyName: '',
            address: '',
            country: '',
            phoneNumber: '',
            companySize: '',
            email: ''
          }}
          onSaveCompanyDetails={async (details) => {
            const success = await saveCompany(details)
            if (success) {
              toast.success('Company details updated successfully')
            } else {
              toast.error('Failed to update company details')
            }
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
          credits={credits}
        />
        <UploadProjectModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadWithName}
          loading={loading}
        />
        {showValidationModal && validationResult && (
          <IFCValidationModal
            validation={validationResult}
            onCancel={() => {
              setShowValidationModal(false)
              setValidationResult(null)
              setPendingUpload(null)
              setShowUploadModal(true)
            }}
            onContinue={() => {
              if (pendingUpload) {
                proceedWithUpload(pendingUpload.projectName, pendingUpload.file)
              }
            }}
          />
        )}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          credits={credits}
        />
        <WelcomeModal
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
          onUploadClick={handleUploadNew}
          userName={userName}
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
            title={currentProjectName || currentFile?.replace('.ifc', '') || 'Project'}
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
                    projectName={currentProjectName}
                    nestingReport={nestingReport}
                    onNestingReportChange={handleNestingReportChange}
                    report={report}
                    initialView="select"
                    onSettingsClick={(handler) => setNestingSettingsHandler(() => handler)}
                    onModelReady={() => setModelReady(true)}
                    companyDetails={company ? {
                      companyName: company.companyName,
                      address: company.address,
                      country: company.country,
                      phoneNumber: company.phoneNumber,
                      email: company.email || ''
                    } : undefined}
                    nestingSettings={(() => {
                      try {
                        const settings = localStorage.getItem('cutwise_nesting_settings')
                        return settings ? JSON.parse(settings) : undefined
                      } catch {
                        return undefined
                      }
                    })()}
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
            title={currentProjectName || currentFile?.replace('.ifc', '') || 'Project'}
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
                    projectName={currentProjectName}
                    nestingReport={nestingReport}
                    onNestingReportChange={handleNestingReportChange}
                    report={report}
                    initialView="results"
                    onSettingsClick={(handler) => setNestingSettingsHandler(() => handler)}
                    companyDetails={company ? {
                      companyName: company.companyName,
                      address: company.address,
                      country: company.country,
                      phoneNumber: company.phoneNumber,
                      email: company.email || ''
                    } : undefined}
                    nestingSettings={(() => {
                      try {
                        const settings = localStorage.getItem('cutwise_nesting_settings')
                        return settings ? JSON.parse(settings) : undefined
                      } catch {
                        return undefined
                      }
                    })()}
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
                projectName={currentProjectName}
                nestingReport={nestingReport}
                onNestingReportChange={handleNestingReportChange}
                report={report}
                companyDetails={company ? {
                  companyName: company.companyName,
                  address: company.address,
                  country: company.country,
                  phoneNumber: company.phoneNumber,
                  email: company.email || ''
                } : undefined}
                nestingSettings={(() => {
                  try {
                    const settings = localStorage.getItem('cutwise_nesting_settings')
                    return settings ? JSON.parse(settings) : undefined
                  } catch {
                    return undefined
                  }
                })()}
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

