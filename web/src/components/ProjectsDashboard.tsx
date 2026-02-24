import { useState, useEffect } from 'react'
import * as ProjectStorage from '../utils/projectStorage'
import type { ProjectData } from '../utils/projectStorage'

interface ProjectsDashboardProps {
  onSelectProject: (project: ProjectData) => void
  onUploadNew: () => void
  onLogout: () => void
  userName?: string
}

const ProjectsDashboard = ({ onSelectProject, onUploadNew, onLogout, userName = 'User' }: ProjectsDashboardProps) => {
  const [projects, setProjects] = useState<ProjectData[]>([])

  // Load projects from storage
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = () => {
    const allProjects = ProjectStorage.getAllProjects()
    setProjects(allProjects)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/Icons/cutwise - logo.svg" 
              alt="Cutwise" 
              className="h-8"
            />
            <h1 className="text-xl font-bold text-gray-900">My Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onUploadNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Upload New Project
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}!
          </h2>
          <p className="text-gray-600">
            You have {projects.length} nesting {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(project.dateCreated)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete project"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Project Icon */}
                  <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg mb-4">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Stats */}
                  {project.stats && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Profiles:</span>
                        <span className="font-medium text-gray-900">{project.stats.totalProfiles || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Tonnage:</span>
                        <span className="font-medium text-gray-900">{(project.stats.totalTonnage || 0).toFixed(2)} tons</span>
                      </div>
                      {project.stats.stockBarsUsed > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Stock Bars Used:</span>
                          <span className="font-medium text-gray-900">{project.stats.stockBarsUsed}</span>
                        </div>
                      )}
                      {project.stats.avgWastePercentage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Avg Waste:</span>
                          <span className="font-medium text-gray-900">{project.stats.avgWastePercentage.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  {project.status && (
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'nested' || project.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'analyzed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status === 'nested' ? 'Nesting Complete' :
                         project.status === 'analyzed' ? 'Ready for Nesting' :
                         project.status === 'uploaded' ? 'Uploaded' : 'Completed'}
                      </span>
                    </div>
                  )}

                  {/* View Button */}
                  <button
                    className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                  >
                    View Report
                  </button>
                </div>
              </div>
            ))}
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
            <button
              onClick={onUploadNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Upload New Project
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProjectsDashboard
