import { SteelReport, NestingReport } from '../types'

interface DashboardProps {
  filename: string | null
  report: SteelReport | null
  nestingReport?: NestingReport | null
  userName?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  trend?: string
  trendColor?: 'green' | 'yellow' | 'red'
  icon?: React.ReactNode
}

const MetricCard = ({ title, value, trend, trendColor, icon }: MetricCardProps) => {
  const trendColorClass = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800'
  }[trendColor || 'green']

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {value}
          </p>
        </div>
        {icon && (
          <div className="text-teal-600 opacity-80">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trendColorClass}`}>
          {trend}
        </div>
      )}
    </div>
  )
}

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export default function Dashboard({ filename, report, nestingReport, userName = 'User' }: DashboardProps) {

  // Calculate metrics from nesting report
  const calculateNestingMetrics = () => {
    if (!nestingReport) {
      return {
        projectCount: 0,
        totalWeight: 0,
        wasteMeters: 0,
        wasteTonnes: 0,
        avgWastePercentage: 0
      }
    }

    // Project count = number of different profiles
    const projectCount = nestingReport.profiles.length

    // Calculate total weight from selected profiles in nesting report
    // We need to estimate weight based on parts and steel density (7850 kg/m³)
    let totalLengthMm = 0
    nestingReport.profiles.forEach(profile => {
      totalLengthMm += profile.total_length
    })
    
    // Estimate weight: assuming average profile cross-section area of ~50 cm² (conservative)
    // Weight (kg) = Length (m) × Cross-section (m²) × Density (kg/m³)
    // For simplicity, use a rough estimate of 39.3 kg/m for average profile
    const totalLengthM = totalLengthMm / 1000
    const estimatedWeightKg = totalLengthM * 39.3 // Rough estimate for IPE/HEA profiles
    
    // Waste in meters (convert from mm)
    const wasteMeters = (nestingReport.summary.total_waste || 0) / 1000
    
    // Waste in tonnes (estimate based on same weight per meter ratio)
    const wasteTonnes = (wasteMeters * 39.3) / 1000
    
    // Average waste percentage from summary
    const avgWastePercentage = nestingReport.summary.avg_waste_percentage || 0

    return {
      projectCount,
      totalWeight: Math.round(estimatedWeightKg),
      wasteMeters: Math.round(wasteMeters * 10) / 10, // Round to 1 decimal
      wasteTonnes: Math.round(wasteTonnes * 1000) / 1000, // Round to 3 decimals
      avgWastePercentage: Math.round(avgWastePercentage * 10) / 10 // Round to 1 decimal
    }
  }

  const nestingMetrics = calculateNestingMetrics()


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal Header Background - extends to include greeting and half of cards */}
      <div className="bg-gradient-to-br from-teal-700 to-teal-600 pb-32">
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {/* Greeting Section */}
          <div className="mb-8">
            <p className="text-teal-100 text-sm mb-1">{getGreeting()}</p>
            <h1 className="text-3xl font-bold text-white">
              {userName}
            </h1>
          </div>
          
          {/* Year/Project selector placeholder */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-teal-50 text-sm">
              {filename || 'No project loaded'}
            </p>
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid - positioned to overlap header */}
      <div className="max-w-7xl mx-auto px-6 -mt-24">
        {nestingReport ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
              <MetricCard
                title="Projects"
                value={nestingMetrics.projectCount}
                trend="+3.72%"
                trendColor="green"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
              
              <MetricCard
                title="Weight"
                value={`${nestingMetrics.totalWeight.toLocaleString()} kg`}
                trend="+8.02%"
                trendColor="green"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                }
              />
              
              <MetricCard
                title="Waste (m)"
                value={nestingMetrics.wasteMeters.toFixed(1)}
                trend="-1.72%"
                trendColor="yellow"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              
              <MetricCard
                title="Waste (t)"
                value={nestingMetrics.wasteTonnes.toFixed(3)}
                trend="-3.72%"
                trendColor="yellow"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              />
              
              <MetricCard
                title="Average Waste %"
                value={`${nestingMetrics.avgWastePercentage.toFixed(1)}%`}
                trend="-3.72%"
                trendColor="green"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
            </div>

            {/* Additional Information Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Nesting Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Stock Bars</span>
                    <span className="font-semibold text-gray-900">{nestingReport.summary.total_stock_bars}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Parts</span>
                    <span className="font-semibold text-gray-900">{nestingReport.summary.total_parts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profile Types</span>
                    <span className="font-semibold text-gray-900">{nestingReport.summary.total_profiles}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    View Detailed Cutting Plan
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    Export Nesting Report
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    Generate PDF Summary
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-lg mb-2">
              No Nesting Report Available
            </p>
            <p className="text-gray-500 text-sm">
              Please generate a nesting report from the Nesting tab to view metrics
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
