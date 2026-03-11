import { useEffect, useState } from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export const WasteOptimizationPreview = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Sample data for the waste chart
  const chartData = [
    { name: 'UNP80', waste: 20 },
    { name: 'IPE 220', waste: 16 },
    { name: 'L70-7', waste: 15 },
    { name: 'IPE200', waste: 13 },
    { name: 'L40-4', waste: 10 },
    { name: 'L60-6', waste: 8 },
    { name: 'UNP160', waste: 3 },
    { name: 'IPE180', waste: 1.5 },
    { name: 'HEA160', waste: 0.8 },
  ]

  return (
    <div className="w-full h-full bg-[#003d3a] flex items-center justify-center p-12">
      <div 
        className={`w-full max-w-4xl transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Waste Optimization Analysis
          </h2>
          <p className="text-gray-300">
            Real-time waste tracking across all steel profiles
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="flex items-center justify-between mb-8">
          {[
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              value: '6.928',
              unit: '(t)',
              label: 'Project Weight',
              delay: 0
            },
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              value: '15.56',
              unit: '(%)',
              label: 'Average Waste',
              delay: 0.1
            },
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              ),
              value: '119.06',
              unit: '(m)',
              label: 'Total Waste',
              delay: 0.2
            },
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              ),
              value: '2.475',
              unit: '(t)',
              label: 'Waste Weight',
              delay: 0.3
            },
          ].map((metric, idx, arr) => (
            <>
              <div
                key={idx}
                className="flex flex-col items-center gap-2 flex-1 animate-fade-in"
                style={{
                  animationDelay: `${metric.delay}s`,
                  animationDuration: '0.6s',
                  animationFillMode: 'both',
                }}
              >
                <div className="w-10 h-10 flex items-center justify-center text-[#00FF9F]">
                  {metric.icon}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {metric.value} <span className="text-sm font-normal text-gray-400">{metric.unit}</span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1">{metric.label}</div>
                </div>
              </div>
              {idx < arr.length - 1 && <div className="w-px h-16 bg-[#00817A]/50"></div>}
            </>
          ))}
        </div>

        {/* Chart Card - Standalone for Login Preview Only */}
        <div className="p-6">
          {/* Chart - Using Recharts library independently */}
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <defs>
                  <linearGradient id="loginLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00817A" />
                    <stop offset="100%" stopColor="#00FF9F" />
                  </linearGradient>
                  <linearGradient id="loginAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00817A" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00817A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" stroke="#00817A" opacity={0.3} />
                
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: '#d1d5db', fontSize: 11, fontWeight: 500 }}
                  label={{
                    value: 'Profile Name',
                    position: 'insideBottom',
                    offset: 15,
                    style: { fill: '#e5e7eb', fontSize: 11, fontWeight: 600 }
                  }}
                />
                
                <YAxis
                  tick={{ fill: '#d1d5db', fontSize: 11, fontWeight: 500 }}
                  label={{
                    value: 'Waste (%)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#e5e7eb', fontSize: 11, fontWeight: 600 }
                  }}
                />
                
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-[#002d2a] border border-[#00817A] rounded-lg shadow-xl p-3 min-w-[180px]">
                        <div className="space-y-2">
                          <div className="font-semibold text-white border-b border-[#00817A]/50 pb-2">
                            {data.name}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-300">Waste:</span>
                              <span className="font-semibold text-[#00FF9F]">{data.waste}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                
                <Area
                  type="monotone"
                  dataKey="waste"
                  stroke="none"
                  fill="url(#loginAreaGradient)"
                  isAnimationActive={true}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
                
                <Line
                  type="monotone"
                  dataKey="waste"
                  stroke="url(#loginLineGradient)"
                  strokeWidth={3}
                  fill="none"
                  dot={(props: any) => {
                    const { cx, cy, index } = props
                    const delay = (index / (chartData.length - 1)) * 2000
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#084242"
                        stroke="#fff"
                        strokeWidth={2}
                        style={{
                          opacity: 0,
                          animation: `loginDotAppear 1ms linear ${delay}ms forwards`
                        }}
                      />
                    )
                  }}
                  isAnimationActive={true}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Add custom animations - Scoped to login preview only */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes loginDotAppear {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in forwards;
        }
      `}</style>
    </div>
  )
}
