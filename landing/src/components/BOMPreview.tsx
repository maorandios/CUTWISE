import { useEffect, useState } from 'react'

export const BOMPreview = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="w-full h-full bg-transparent flex items-center justify-center p-4 md:p-12">
      <div 
        className={`w-full max-w-[90%] md:max-w-3xl transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}
      >
        {/* BOM Summary Cards */}
        <div className="flex items-center justify-between mb-8">
          {[
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              value: '24',
              label: 'Total Items',
              delay: 0
            },
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              ),
              value: '8',
              label: 'Profile Types',
              delay: 0.1
            },
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              value: '6.928t',
              label: 'Total Weight',
              delay: 0.2
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
                    {metric.value}
                  </div>
                  <div className="text-xs text-gray-300 mt-1">{metric.label}</div>
                </div>
              </div>
              {idx < arr.length - 1 && <div className="w-px h-16 bg-[#00817A]/50"></div>}
            </>
          ))}
        </div>

        {/* BOM Visualization */}
        <div className="bg-gradient-to-br from-[#002d2a] to-[#001a18] rounded-2xl p-8 border-2 border-[#00817A]/40 mb-6 shadow-2xl">
          {/* BOM Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FF9F]/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Export Format</div>
                <div className="text-xl font-bold text-white">Excel / PDF</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#00817A]/20 rounded-lg py-2 px-4 border border-[#00FF9F]/30">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white font-semibold text-sm">Ready to Export</span>
            </div>
          </div>

          {/* BOM Table Preview */}
          <div className="bg-[#003d3a] rounded-xl p-6 border border-[#00817A]/30">
            <div className="bg-[#002d2a] rounded-xl border border-[#00817A]/30 overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-[#001a18] border-b border-[#00817A]/30">
                    <th className="text-left py-3 px-4 font-semibold text-gray-300 w-[30%] whitespace-nowrap">Profile Name</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300 w-[20%] whitespace-nowrap">Stock Length (m)</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300 w-[15%] whitespace-nowrap">Quantity</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300 w-[20%] whitespace-nowrap">Weight (t)</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300 w-[15%] whitespace-nowrap">Waste (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { profile: 'HEB 360', stockLength: '12', qty: 4, weight: '1.245', waste: '0.22' },
                    { profile: 'IPE 220', stockLength: '6', qty: 8, weight: '0.892', waste: '1.5' },
                    { profile: 'UNP 160', stockLength: '12', qty: 2, weight: '0.654', waste: '3.0' },
                    { profile: 'L70-7', stockLength: '6', qty: 12, weight: '0.428', waste: '8.0' },
                    { profile: 'IPE 200', stockLength: '12', qty: 6, weight: '1.124', waste: '13.0' },
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#00817A]/20 hover:bg-[#00817A]/10 transition-colors animate-slide-in"
                      style={{
                        animationDelay: `${0.4 + idx * 0.1}s`,
                        animationDuration: '0.5s',
                        animationFillMode: 'both',
                      }}
                    >
                      <td className="py-3 px-4 text-white font-medium text-left">{row.profile}</td>
                      <td className="py-3 px-4 font-bold text-[#00FF9F] text-center">{row.stockLength}</td>
                      <td className="py-3 px-4 text-gray-300 text-center">{row.qty}</td>
                      <td className="py-3 px-4 text-white text-center">{row.weight}</td>
                      <td className="py-3 px-4 font-bold text-[#00FF9F] text-center">{row.waste}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-6 flex items-center justify-center gap-3 bg-[#00817A]/20 rounded-lg py-3 px-4 border border-[#00FF9F]/30">
            <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-white font-semibold">Complete material breakdown</span>
            <span className="text-gray-400">•</span>
            <span className="text-[#00FF9F] font-bold">Export to Excel or PDF</span>
          </div>
        </div>
      </div>

      {/* Add custom animations */}
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

        @keyframes scroll-hint {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(8px);
            opacity: 0.7;
          }
        }

        .animate-fade-in {
          animation: fade-in forwards;
        }

        .animate-slide-in {
          animation: slide-in forwards;
        }

        .animate-scroll-hint {
          animation: scroll-hint 2s ease-in-out infinite;
        }
      `}</style>
            </div>
          )
        }
