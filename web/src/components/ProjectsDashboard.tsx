import { useState, useEffect } from 'react'
import * as ProjectStorage from '../utils/projectStorage'
import type { ProjectData, CompanyDetails } from '../utils/projectStorage'
import { Button } from '@/components/ui/Button'
import { Header } from './Header'
import { Footer } from './Footer'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AnimatedDashboardCards } from './AnimatedDashboardCards'

interface ProjectsDashboardProps {
  onSelectProject: (project: ProjectData) => void
  onUploadNew: () => void
  onLogout: () => void
  userName?: string
  refreshTrigger?: number
  onOpenSettings?: () => void
}

const ProjectsDashboard = ({ onSelectProject, onUploadNew, onLogout, userName = 'User', refreshTrigger, onOpenSettings }: ProjectsDashboardProps) => {
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [displayCount, setDisplayCount] = useState(20)
  const [searchText, setSearchText] = useState('')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [hasAnimated, setHasAnimated] = useState(false)

  // Load projects from storage (reload when refreshTrigger changes)
  useEffect(() => {
    loadProjects()
  }, [refreshTrigger])

  // Trigger animation on first mount
  useEffect(() => {
    if (!hasAnimated && projects.length > 0) {
      const timer = setTimeout(() => {
        setHasAnimated(true)
      }, 1600) // Slightly longer than animation duration
      return () => clearTimeout(timer)
    }
  }, [hasAnimated, projects.length])

  const loadProjects = () => {
    const allProjects = ProjectStorage.getAllProjects()
    setProjects(allProjects)
    setDisplayCount(20) // Reset to 20 when projects are reloaded
    console.log('[Dashboard] Loaded', allProjects.length, 'projects')
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


  // Filter projects based on search text and date
  const filteredProjects = projects.filter(project => {
    // Text filter
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      const nameMatch = project.name.toLowerCase().includes(searchLower)
      if (!nameMatch) return false
    }

    // Date filter
    if (filterMonth !== 'all' || filterYear !== 'all') {
      const projectDate = new Date(project.dateCreated)
      const projectMonth = projectDate.getMonth() + 1 // 1-12
      const projectYear = projectDate.getFullYear()

      if (filterMonth !== 'all' && projectMonth !== parseInt(filterMonth)) {
        return false
      }
      if (filterYear !== 'all' && projectYear !== parseInt(filterYear)) {
        return false
      }
    }

    return true
  })

  // Get unique years from all projects for the year filter dropdown
  const availableYears = Array.from(new Set(
    projects.map(p => new Date(p.dateCreated).getFullYear())
  )).sort((a, b) => b - a)

  const handleResetFilters = () => {
    setSearchText('')
    setFilterMonth('all')
    setFilterYear('all')
    setDisplayCount(20)
  }

  // Calculate aggregate metrics from all projects (not filtered)
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
        onSettingsClick={onOpenSettings}
        onLogout={onLogout}
        showUploadButton={false}
        title="My Projects"
      />

      {/* Dark Header Background - matches top menu, extends to middle of cards */}
      <div className="bg-[#11181C] pb-28">
        <div className="max-w-[1440px] mx-auto px-6 pt-8">
          {/* Greeting Section with Upload Button */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">Hello,</p>
              <h1 className="text-3xl font-bold text-white">
                {userName}
              </h1>
            </div>
            
            {/* Upload New Project Button */}
            <button
              onClick={onUploadNew}
              className="relative bg-[#008A67] text-white pl-6 pr-2 py-2 rounded-full flex items-center gap-4 transition-all hover:shadow-lg overflow-hidden group"
            >
              {/* Expanding white background on hover - expands from right to left */}
              <div className="absolute inset-0 bg-white rounded-full transform scale-x-0 origin-right transition-transform duration-300 ease-out group-hover:scale-x-100"></div>
              
              <span className="text-lg font-medium relative z-10 transition-colors duration-300 group-hover:text-[#008A67]">Upload new project</span>
              <div className="h-[55px] w-[55px] bg-white rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                <svg className="w-5 h-5 text-[#008A67] rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 -mt-[100px]">
        {/* Metric Cards - Full width with dividers */}
        <AnimatedDashboardCards
          totalProjects={metrics.totalProjects}
          totalWeightT={(metrics.totalWeight / 1000)}
          totalWasteMeters={metrics.totalWasteMeters}
          totalWasteTonnage={metrics.totalWasteTonnage}
          avgWastePercentage={metrics.avgWastePercentage}
          shouldAnimate={!hasAnimated}
        />

        {/* Filter Section */}
        {projects.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm px-6 py-4 mb-6 border border-gray-100">
            <div className="flex items-center gap-4">
              {/* Search Text Filter */}
              <div className="flex-1">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by project name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Combined Date Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <option value="all">All Months</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 border border-input bg-background rounded-md text-sm hover:bg-muted/50 transition-colors cursor-pointer h-[42px] whitespace-nowrap"
              >
                Reset
              </button>

              {/* Results Summary */}
              <div className="text-sm text-gray-600 whitespace-nowrap ml-2">
                Showing {Math.min(displayCount, filteredProjects.length)} of {filteredProjects.length}
                {(searchText || filterMonth !== 'all' || filterYear !== 'all') && ` (${projects.length} total)`}
              </div>
            </div>
          </div>
        )}

        {/* Projects Table */}
        {filteredProjects.length > 0 ? (
          <>
            <div className="rounded-lg border overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary h-16">
                    <TableHead className="text-primary-foreground font-semibold h-16 text-base w-[6%] pl-6">#</TableHead>
                    <TableHead className="text-primary-foreground font-semibold h-16 text-base w-[18%]">Project Name</TableHead>
                    <TableHead className="text-primary-foreground font-semibold h-16 text-base w-[10%]">Date</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[12%] whitespace-nowrap">Project Weight (t)</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[10%] bg-primary/70">Waste (%)</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[10%] bg-primary/70">Waste (m)</TableHead>
                    <TableHead className="text-primary-foreground text-right font-semibold h-16 text-base w-[10%] bg-primary/70">Waste (t)</TableHead>
                    <TableHead className="text-primary-foreground text-center font-semibold h-16 text-base w-[8%]">Status</TableHead>
                    <TableHead className="text-primary-foreground text-center font-semibold h-16 text-base w-[8%] bg-primary/50">Preview</TableHead>
                    <TableHead className="text-primary-foreground text-center font-semibold h-16 text-base w-[8%] bg-primary/50 pr-6">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.slice(0, displayCount).map((project, index) => {
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
                        <TableCell className="text-center h-12">
                          <div className="flex items-center justify-center">
                            <div 
                              className={`w-2.5 h-2.5 rounded-full ${
                                project.nestingReport ? 'bg-green-500' : 'bg-orange-500'
                              }`}
                              title={project.nestingReport ? 'Complete' : 'Pending'}
                            />
                          </div>
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
            
            {/* Load More Button */}
            {displayCount < filteredProjects.length && (
              <div className="flex justify-center mt-6 mb-12">
                <Button
                  onClick={() => setDisplayCount(prev => prev + 20)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base font-medium"
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        ) : projects.length > 0 ? (
          // No filtered results
          <div className="flex flex-col items-center justify-center py-20 mb-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters</p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-input bg-background rounded-md text-sm hover:bg-muted/50 transition-colors cursor-pointer h-[42px]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          // Empty State - No projects at all
          <div className="flex flex-col items-center justify-center py-20 mb-12">
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
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

export default ProjectsDashboard
