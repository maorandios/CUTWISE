import { useState, useEffect } from 'react'
import { SteelReport } from '../types'
import { PreviewModal } from './PreviewModal'

interface PlatesTabProps {
  filename: string
  report: SteelReport | null
  cachedData?: any[]
}

interface PlateDetail {
  part_name: string
  assembly_mark: string
  thickness: string
  profile_name: string
  width: number | null
  length: number | null
  weight: number
  quantity: number
  total_weight: number
  ids: number[]
}

export default function PlatesTab({ filename, report, cachedData }: PlatesTabProps) {
  const [plates, setPlates] = useState<PlateDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterThickness, setFilterThickness] = useState<string>('all')
  const [filterAssembly, setFilterAssembly] = useState<string>('all')
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    elementIds: number[]
    title: string
  }>({
    isOpen: false,
    elementIds: [],
    title: ''
  })

  // Use cached data if available, otherwise fetch
  useEffect(() => {
    if (cachedData) {
      console.log('[PlatesTab] Using cached data:', cachedData.length, 'plates')
      setPlates(cachedData)
    } else if (filename && report) {
      fetchPlates()
    }
  }, [filename, report, cachedData])

  const fetchPlates = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard-details/${encodeURIComponent(filename)}`)
      if (response.ok) {
        const data = await response.json()
        setPlates(data.plates || [])
      }
    } catch (error) {
      console.error('Error fetching plates:', error)
    } finally {
      setLoading(false)
    }
  }

  const openPreview = (elementIds: number[], title: string) => {
    setPreviewModal({
      isOpen: true,
      elementIds,
      title
    })
  }

  const closePreview = () => {
    setPreviewModal({
      isOpen: false,
      elementIds: [],
      title: ''
    })
  }

  // Get unique values for filters
  const uniqueThicknesses = Array.from(new Set(plates.map(p => p.thickness))).sort()
  const uniqueAssemblies = Array.from(new Set(plates.map(p => p.assembly_mark))).sort()

  // Filter plates
  const filteredPlates = plates.filter((plate) => {
    const searchLower = searchText.toLowerCase()
    const matchesSearch = searchText === '' || 
      plate.part_name.toLowerCase().includes(searchLower) ||
      plate.thickness.toLowerCase().includes(searchLower) ||
      plate.profile_name.toLowerCase().includes(searchLower) ||
      plate.assembly_mark.toLowerCase().includes(searchLower) ||
      (plate.width?.toString() || '').includes(searchLower) ||
      (plate.length?.toString() || '').includes(searchLower) ||
      plate.weight.toString().includes(searchLower)

    const matchesThickness = filterThickness === 'all' || plate.thickness === filterThickness
    const matchesAssembly = filterAssembly === 'all' || plate.assembly_mark === filterAssembly

    return matchesSearch && matchesThickness && matchesAssembly
  })

  const clearFilters = () => {
    setSearchText('')
    setFilterThickness('all')
    setFilterAssembly('all')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plates</h1>
          <p className="text-gray-600">
            View and filter all plate elements
          </p>
        </div>

        {/* Summary Cards */}
        {plates.length > 0 && (
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Total Weight Card */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium uppercase tracking-wider">Total Weight</p>
                  <p className="text-3xl font-bold mt-2">
                    {plates.reduce((sum, p) => sum + (p.total_weight || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-green-100 text-base mt-1">kg</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 rounded-full p-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Percentage Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">% of Total Project</p>
                  <p className="text-3xl font-bold mt-2">
                    {report && report.total_tonnage 
                      ? ((plates.reduce((sum, p) => sum + (p.total_weight || 0), 0) / (report.total_tonnage * 1000)) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </p>
                  <p className="text-emerald-100 text-base mt-1">of project weight</p>
                </div>
                <div className="bg-emerald-400 bg-opacity-30 rounded-full p-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Quantity Card */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm font-medium uppercase tracking-wider">Total Quantity</p>
                  <p className="text-3xl font-bold mt-2">
                    {plates.reduce((sum, p) => sum + (p.quantity || 1), 0)}
                  </p>
                  <p className="text-teal-100 text-base mt-1">pieces</p>
                </div>
                <div className="bg-teal-400 bg-opacity-30 rounded-full p-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Section */}
        {plates.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Filter & Search</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Free Text Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search plates..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchText && (
                    <button
                      onClick={() => setSearchText('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Filter by Thickness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thickness
                </label>
                <select
                  value={filterThickness}
                  onChange={(e) => setFilterThickness(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Thicknesses</option>
                  {uniqueThicknesses.map((thickness) => (
                    <option key={thickness} value={thickness}>
                      {thickness}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Assembly */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assembly
                </label>
                <select
                  value={filterAssembly}
                  onChange={(e) => setFilterAssembly(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Assemblies</option>
                  {uniqueAssemblies.map((assembly) => (
                    <option key={assembly} value={assembly}>
                      {assembly}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Counter */}
            <div className="mt-4 text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredPlates.length}</span> of <span className="font-semibold text-gray-900">{plates.length}</span> plates
            </div>
          </div>
        )}

        {/* Plates Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Plate Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assembly</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Thickness</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profile Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Width (mm)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Length (mm)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Weight (kg)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Weight (kg)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPlates.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      {plates.length === 0 ? 'No plates found' : 'No plates match the current filters'}
                    </td>
                  </tr>
                ) : (
                  filteredPlates.map((plate, index) => (
                    <tr key={`${plate.part_name}-${plate.thickness}-${plate.width}-${plate.length}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900">{plate.part_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{plate.assembly_mark}</td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{plate.thickness}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">{plate.profile_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {plate.width ? plate.width.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {plate.length ? plate.length.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {plate.weight.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                        {plate.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                        {plate.total_weight.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openPreview([plate.ids[0]], `Plate: ${plate.part_name} (${plate.thickness})`)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          View 3D
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredPlates.length > 0 && (
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      Total ({filteredPlates.reduce((sum, p) => sum + p.quantity, 0)} parts):
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                      {filteredPlates.length} groups
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {filteredPlates.reduce((sum, p) => sum + p.total_weight, 0).toFixed(2)} kg
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={closePreview}
        filename={filename}
        elementIds={previewModal.elementIds}
        title={previewModal.title}
      />
    </div>
  )
}

