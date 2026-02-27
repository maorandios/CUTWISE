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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onLogout={onLogout}
        showUploadButton={true}
        onUploadClick={onUploadNew}
        title="My Projects"
      />

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}!
          </h2>
          <p className="text-gray-600">
            You have {projects.length} nesting {projects.length === 1 ? 'project' : 'projects'}
          </p>
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
