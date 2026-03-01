import { useState, useEffect } from 'react'
import * as ProjectStorage from '../utils/projectStorage'
import type { ProjectData, CompanyDetails } from '../utils/projectStorage'
import CompanySettingsModal from './CompanySettingsModal'
import { Button } from '@/components/ui/Button'
import { Header } from './Header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ProjectsDashboardProps {
  onSelectProject: (project: ProjectData) => void
  onUploadNew: () => void
  onLogout: () => void
  userName?: string
  refreshTrigger?: number
}

const ProjectsDashboard = ({ onSelectProject, onUploadNew, onLogout, userName = 'User', refreshTrigger }: ProjectsDashboardProps) => {
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    companyName: '',
    address: '',
    country: '',
    phoneNumber: '',
    companySize: ''
  })

  // Load projects from storage (reload when refreshTrigger changes)
  useEffect(() => {
    loadProjects()
    loadCompanyDetails()
  }, [refreshTrigger])

  const loadProjects = () => {
    const allProjects = ProjectStorage.getAllProjects()
    setProjects(allProjects)
    console.log('[Dashboard] Loaded', allProjects.length, 'projects')
  }
  
  const loadCompanyDetails = () => {
    const details = ProjectStorage.getCompanyDetails()
    if (details) {
      setCompanyDetails(details)
    }
  }
  
  const handleSaveCompanyDetails = (details: CompanyDetails) => {
    ProjectStorage.saveCompanyDetails(details)
    setCompanyDetails(details)
  }

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project?')) {
      const success = ProjectStorage.deleteProject(projectId)
      if (success) {
        loadProjects() // Reload projects
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Calculate aggregate metrics from all projects
  const calculateAggregateMetrics = () => {
    if (projects.length === 0) {
      return {
        totalProjects: 0,
        totalWeight: 0,
        totalWasteMeters: 0,
        totalWasteTonnage: 0,
        avgWastePercentage: 0
      }
    }

    let totalWeight = 0
    let totalWasteMeters = 0
    let totalWasteTonnage = 0
    let totalWastePercentage = 0

    projects.forEach(project => {
      totalWeight += project.stats?.totalTonnage || 0
      totalWasteMeters += project.stats?.totalWasteMeters || 0
      totalWasteTonnage += project.stats?.totalWasteTonnage || 0
      totalWastePercentage += project.stats?.avgWastePercentage || 0
    })

    const avgWastePercentage = projects.length > 0 ? totalWastePercentage / projects.length : 0

    return {
      totalProjects: projects.length,
      totalWeight: Math.round(totalWeight * 1000), // Convert tonnes to kg
      totalWasteMeters: Math.round(totalWasteMeters * 10) / 10,
      totalWasteTonnage: Math.round(totalWasteTonnage * 1000) / 1000,
      avgWastePercentage: Math.round(avgWastePercentage * 10) / 10
    }
  }

  const metrics = calculateAggregateMetrics()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onLogout={onLogout}
        showUploadButton={true}
        onUploadClick={onUploadNew}
        title="My Projects"
      />

      {/* Teal Header Background - extends to include greeting and half of cards */}
      <div className="bg-gradient-to-br from-teal-700 to-teal-600 pb-32">
        <div className="max-w-[1440px] mx-auto px-6 pt-8">
          {/* Greeting Section */}
          <div className="mb-8">
            <p className="text-teal-100 text-sm mb-1">{getGreeting()}</p>
            <h1 className="text-3xl font-bold text-white">
              {userName}
            </h1>
          </div>
          
          {/* Project count and actions */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-teal-50 text-sm">
              You have {projects.length} nesting {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 -mt-24">
        {/* Metric Cards Grid - positioned to overlap header */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {/* Projects Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Projects
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.totalProjects}
                </p>
              </div>
              <div className="text-teal-600 opacity-80">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              +3.72%
            </div>
          </div>

          {/* Weight Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Weight
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {(metrics.totalWeight / 1000).toFixed(3)} t
                </p>
              </div>
              <div className="text-teal-600 opacity-80">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              +8.02%
            </div>
          </div>

          {/* Waste (m) Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Waste (m)
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.totalWasteMeters.toFixed(1)}
                </p>
              </div>
              <div className="text-teal-600 opacity-80">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              -1.72%
            </div>
          </div>

          {/* Waste (t) Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Waste (t)
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.totalWasteTonnage.toFixed(3)}
                </p>
              </div>
              <div className="text-teal-600 opacity-80">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              -3.72%
            </div>
          </div>

          {/* Average Waste % Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Average Waste %
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.avgWastePercentage.toFixed(1)}%
                </p>
              </div>
              <div className="text-teal-600 opacity-80">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              -3.72%
            </div>
          </div>
        </div>

        {/* Projects Table */}
        {projects.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary h-16">
                    <TableHead className="text-primary-foreground font-semibold h-16 text-base w-[8%] pl-6">#</TableHead>
                    <TableHead className="text-primary-foreground font-semibold h-16 text-base w-[22%]">Project Name</TableHead>
                    <TableHead className="text-primary-foreground font-semibold h-16 text-base w-[11%]">Date</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[11%]">Total Project Weight (t)</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[11%] bg-primary/70">Waste (%)</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[11%] bg-primary/70">Waste (m)</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[11%] bg-primary/70">Waste (t)</TableHead>
                    <TableHead className="text-primary-foreground text-center font-semibold h-16 text-base w-[7.5%] bg-primary/50">Preview</TableHead>
                    <TableHead className="text-primary-foreground text-center font-semibold h-16 text-base w-[7.5%] bg-primary/50 pr-6">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project, index) => {
                    const totalWeight = project.stats?.totalTonnage || 0
                    const wastePercentage = project.stats?.avgWastePercentage || 0
                    const wasteTonnage = project.stats?.totalWasteTonnage || 0
                    const wasteMeters = project.stats?.totalWasteMeters || 0
                    
                    return (
                      <TableRow key={project.id} className="h-12 hover:bg-gray-100">
                        <TableCell className="font-medium h-12 pl-6">
                          {index + 1}
                        </TableCell>
                        <TableCell className="h-12 font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell className="h-12">
                          {formatDate(project.dateCreated)}
                        </TableCell>
                        <TableCell className="text-right h-12">
                          {totalWeight.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right h-12 bg-gray-50/50">
                          {wastePercentage.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right h-12 bg-gray-50/50">
                          {wasteMeters.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right h-12 bg-gray-50/50">
                          {wasteTonnage.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-center h-12 bg-gray-100/70">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSelectProject(project)}
                            title="Preview project"
                            className="h-8 w-8"
                          >
                            <img src="/Icons/preview.svg" alt="Preview" className="w-5 h-5" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center h-12 bg-gray-100/70 pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            title="Delete project"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Upload your first IFC file to get started</p>
            <Button onClick={onUploadNew} size="lg">
              Upload New Project
            </Button>
          </div>
        )}
      </main>
      
      {/* Company Settings Modal */}
      <CompanySettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveCompanyDetails}
        currentDetails={companyDetails}
      />
    </div>
  )
}

export default ProjectsDashboard
