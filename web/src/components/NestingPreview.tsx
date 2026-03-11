import { useEffect, useState } from 'react'

export const NestingPreview = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="w-full h-full bg-[#003d3a] flex items-center justify-center p-12">
      <div 
        className={`w-full max-w-3xl transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">
            Optimized Cutting Plan
          </h2>
          <p className="text-gray-300">
            Optimize your steel cutting with advanced algorithms
          </p>
        </div>

        {/* Profile Info Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00817A]/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Profile Type</div>
              <div className="text-2xl font-bold text-white">HEB360</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Waste</div>
            <div className="text-3xl font-bold text-[#00FF9F]">0.22%</div>
          </div>
        </div>

        {/* Nesting Visualization Card */}
        <div className="mb-6">

          {/* Stock Bar Visualization - Main Feature */}
          <div className="bg-gradient-to-br from-[#002d2a] to-[#001a18] rounded-2xl p-8 border-2 border-[#00817A]/40 mb-6 shadow-2xl">
            {/* Stock Bar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00FF9F]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Stock Length</div>
                  <div className="text-xl font-bold text-white">12000mm</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide text-right">Waste</div>
                  <div className="text-xl font-bold text-[#ef4444]">27mm</div>
                </div>
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* SVG Nesting Visualization */}
            <div className="relative bg-[#003d3a] rounded-xl p-6 border border-[#00817A]/30">
            <svg
              viewBox="0 0 1200 80"
              className="w-full h-auto"
              style={{ maxHeight: '120px' }}
            >
              {/* Stock bar background with gradient */}
              <defs>
                <linearGradient id="stockBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00817A" stopOpacity="0.15" />
                  <stop offset="98%" stopColor="#00817A" stopOpacity="0.15" />
                  <stop offset="98%" stopColor="#ef4444" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <rect
                x="0"
                y="0"
                width="1200"
                height="80"
                fill="url(#stockBarGradient)"
                rx="8"
              />

              {/* Nested parts sharing diagonal cuts - one saw cut = two part ends */}
              {(() => {
                const slopeOffset = 20
                const wasteStart = 1178
                const startX = 5
                let currentX = startX
                
                // Calculate part widths to fill exactly to the waste (1178 - 5 = 1173 total)
                // With 7 slopes between 8 parts: 1173 + (7 * 20) = 1313 total width needed
                const parts = [
                  { width: 168, label: 'B1', delay: 0 },
                  { width: 158, label: 'B2', delay: 0.08 },
                  { width: 148, label: 'B3', delay: 0.16 },
                  { width: 178, label: 'B4', delay: 0.24 },
                  { width: 168, label: 'B5', delay: 0.32 },
                  { width: 158, label: 'B6', delay: 0.40 },
                  { width: 148, label: 'B7', delay: 0.48 },
                  { width: 187, label: 'B8', delay: 0.56 },
                ]
                
                return parts.map((part, idx) => {
                  const x = currentX
                  const isFirst = idx === 0
                  const isLast = idx === parts.length - 1
                  
                  // Create trapezoid shape with diagonal cuts
                  // Parts share the exact same diagonal line coordinates
                  let path
                  if (isFirst) {
                    // First part - straight left, diagonal right
                    path = `M ${x} 10 L ${x + part.width} 10 L ${x + part.width - slopeOffset} 70 L ${x} 70 Z`
                    currentX = x + part.width - slopeOffset // Next part starts at the bottom of this diagonal
                  } else if (isLast) {
                    // Last part - diagonal left, straight right
                    path = `M ${x + slopeOffset} 10 L ${x + part.width} 10 L ${x + part.width} 70 L ${x} 70 Z`
                    currentX = x + part.width
                  } else {
                    // Middle parts - diagonal both sides
                    path = `M ${x + slopeOffset} 10 L ${x + part.width} 10 L ${x + part.width - slopeOffset} 70 L ${x} 70 Z`
                    currentX = x + part.width - slopeOffset // Next part starts at the bottom of this diagonal
                  }
                  
                  return (
                    <g key={idx}>
                      {/* Part with diagonal cuts */}
                    <path
                      d={path}
                      fill="#00817A"
                      fillOpacity="0.3"
                      stroke="#00FF9F"
                      strokeWidth="2.5"
                      strokeLinejoin="miter"
                      className="animate-fade-in"
                      style={{
                        animationDelay: `${part.delay}s`,
                        animationDuration: '0.6s',
                        animationFillMode: 'both',
                      }}
                    />
                      {/* Part label - bright and clear */}
                      <text
                        x={x + part.width / 2}
                        y="40"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#00FF9F"
                        fontSize="18"
                        fontWeight="800"
                        className="animate-fade-in"
                        style={{
                          animationDelay: `${part.delay + 0.2}s`,
                          animationDuration: '0.6s',
                          animationFillMode: 'both',
                        }}
                      >
                        {part.label}
                      </text>
                    </g>
                  )
                })
              })()}

              {/* Waste section at the end - highlighted */}
              <g>
                <rect
                  x="1178"
                  y="10"
                  width="17"
                  height="60"
                  fill="#ef4444"
                  fillOpacity="0.4"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  rx="4"
                  className="animate-fade-in"
                  style={{
                    animationDelay: '0.7s',
                    animationDuration: '0.6s',
                    animationFillMode: 'both',
                  }}
                />
                {/* Waste label only */}
                <text
                  x="1186"
                  y="40"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ef4444"
                  fontSize="11"
                  fontWeight="800"
                  className="animate-fade-in"
                  style={{
                    animationDelay: '0.9s',
                    animationDuration: '0.6s',
                    animationFillMode: 'both',
                  }}
                >
                  27
                </text>
              </g>
            </svg>
            </div>

            {/* Efficiency Callout */}
            <div className="mt-6 flex items-center justify-center gap-3 bg-[#00817A]/20 rounded-lg py-3 px-4 border border-[#00FF9F]/30">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white font-semibold">8 parts perfectly nested</span>
              <span className="text-gray-400">•</span>
              <span className="text-[#00FF9F] font-bold">Only 0.22% waste</span>
            </div>
          </div>

          {/* Technical Settings */}
          <div className="flex items-center justify-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <img src="/Icons/kerf for section.svg" alt="Kerf" className="w-4 h-4 opacity-60" />
              <span className="text-gray-400">Kerf:</span>
              <span className="font-semibold text-white">3mm</span>
            </div>
            <div className="w-px h-4 bg-[#00817A]/50"></div>
            <div className="flex items-center gap-2">
              <img src="/Icons/trim for section.svg" alt="Trim" className="w-4 h-4 opacity-60" />
              <span className="text-gray-400">Trim:</span>
              <span className="font-semibold text-white">15mm</span>
            </div>
            <div className="w-px h-4 bg-[#00817A]/50"></div>
            <div className="flex items-center gap-2">
              <img src="/Icons/tolerance for section.svg" alt="Tolerance" className="w-4 h-4 opacity-60" />
              <span className="text-gray-400">Tolerance:</span>
              <span className="font-semibold text-white">10mm</span>
            </div>
          </div>

          {/* Cutting List */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h4 className="text-lg font-semibold text-white">Cutting List</h4>
            </div>
            
            <div className="bg-[#002d2a] rounded-xl border border-[#00817A]/30 overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-[#001a18] border-b border-[#00817A]/30">
                    <th className="text-left py-3 px-4 font-semibold text-gray-300 w-[40%]">Profile Name</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300 w-[20%]">Part Number</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300 w-[20%]">Length (mm)</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300 w-[20%]">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { part: 'B1', profile: 'HEB 360', length: '1800', qty: 4 },
                    { part: 'B2', profile: 'HEB 360', length: '1450', qty: 3 },
                    { part: 'B3', profile: 'HEB 360', length: '950', qty: 2 },
                    { part: 'B4', profile: 'HEB 360', length: '2100', qty: 5 },
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#00817A]/20 hover:bg-[#00817A]/10 transition-colors animate-slide-in"
                      style={{
                        animationDelay: `${0.5 + idx * 0.1}s`,
                        animationDuration: '0.5s',
                        animationFillMode: 'both',
                      }}
                    >
                      <td className="py-3 px-4 text-white font-medium text-left">{row.profile}</td>
                      <td className="py-3 px-4 font-bold text-[#00FF9F] text-center">{row.part}</td>
                      <td className="py-3 px-4 text-gray-300 text-center">{row.length}</td>
                      <td className="py-3 px-4 font-bold text-[#00FF9F] text-lg text-center">{row.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add custom animations to global styles */}
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

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in forwards;
        }

        .animate-slide-in {
          animation: slide-in forwards;
        }
      `}</style>
    </div>
  )
}
