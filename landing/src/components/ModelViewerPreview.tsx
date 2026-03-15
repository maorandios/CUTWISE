import { useEffect, useState } from 'react'

export const ModelViewerPreview = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="w-full h-full bg-transparent flex items-center justify-center p-12">
      <div 
        className={`w-full max-w-3xl transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}
      >
        {/* Viewer Stats Cards */}
        <div className="flex items-center justify-between mb-8">
          {[
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              ),
              value: '1,247',
              label: 'Total Parts',
              delay: 0
            },
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              ),
              value: '24',
              label: 'Profile Types',
              delay: 0.1
            },
            { 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
              value: '856',
              label: 'Selected',
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

        {/* 3D Viewer Visualization */}
        <div className="bg-gradient-to-br from-[#002d2a] to-[#001a18] rounded-2xl p-8 border-2 border-[#00817A]/40 mb-6 shadow-2xl">
          {/* Viewer Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FF9F]/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Interactive View</div>
                <div className="text-xl font-bold text-white">3D Model</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#00817A]/20 rounded-lg py-2 px-4 border border-[#00FF9F]/30">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span className="text-white font-semibold text-sm">Click to Select</span>
            </div>
          </div>

          {/* 3D Viewer Container */}
          <div className="bg-[#003d3a] rounded-xl p-6 border border-[#00817A]/30 mb-6">
            {/* Simulated 3D View with Grid and Structure */}
            <div className="relative w-full h-80 bg-gradient-to-b from-[#002d2a] to-[#001a18] rounded-lg overflow-hidden">
              {/* Grid Background */}
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 320">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00817A" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="400" height="320" fill="url(#grid)" />
              </svg>

              {/* 3D Structure Representation */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 320">
                {/* Building Frame - Isometric View */}
                
                {/* Vertical Columns (Selected - Bright Green) */}
                <g className="animate-fade-in" style={{ animationDelay: '0.3s', animationDuration: '0.8s', animationFillMode: 'both' }}>
                  {/* Left Front Column */}
                  <line x1="100" y1="200" x2="100" y2="80" stroke="#00FF9F" strokeWidth="4" strokeLinecap="round" />
                  <line x1="100" y1="80" x2="110" y2="70" stroke="#00FF9F" strokeWidth="4" strokeLinecap="round" />
                  <line x1="110" y1="70" x2="110" y2="190" stroke="#00FF9F" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Right Front Column */}
                  <line x1="200" y1="200" x2="200" y2="80" stroke="#00FF9F" strokeWidth="4" strokeLinecap="round" />
                  <line x1="200" y1="80" x2="210" y2="70" stroke="#00FF9F" strokeWidth="4" strokeLinecap="round" />
                  <line x1="210" y1="70" x2="210" y2="190" stroke="#00FF9F" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Left Back Column */}
                  <line x1="150" y1="160" x2="150" y2="60" stroke="#00FF9F" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                  <line x1="150" y1="60" x2="160" y2="50" stroke="#00FF9F" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                  <line x1="160" y1="50" x2="160" y2="150" stroke="#00FF9F" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                  
                  {/* Right Back Column */}
                  <line x1="250" y1="160" x2="250" y2="60" stroke="#00FF9F" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                  <line x1="250" y1="60" x2="260" y2="50" stroke="#00FF9F" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                  <line x1="260" y1="50" x2="260" y2="150" stroke="#00FF9F" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                </g>

                {/* Horizontal Beams (Not Selected - Gray) */}
                <g className="animate-fade-in" style={{ animationDelay: '0.5s', animationDuration: '0.8s', animationFillMode: 'both' }}>
                  {/* Top Beams */}
                  <line x1="100" y1="80" x2="200" y2="80" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  <line x1="150" y1="60" x2="250" y2="60" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  <line x1="100" y1="80" x2="150" y2="60" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  <line x1="200" y1="80" x2="250" y2="60" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  
                  {/* Middle Beams */}
                  <line x1="100" y1="140" x2="200" y2="140" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  <line x1="150" y1="110" x2="250" y2="110" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  
                  {/* Bottom Beams */}
                  <line x1="100" y1="200" x2="200" y2="200" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  <line x1="150" y1="160" x2="250" y2="160" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                </g>

                {/* Selection Indicators */}
                <g className="animate-pulse-slow">
                  <circle cx="100" cy="140" r="8" fill="#00FF9F" opacity="0.6" />
                  <circle cx="200" cy="140" r="8" fill="#00FF9F" opacity="0.6" />
                  <circle cx="150" cy="110" r="6" fill="#00FF9F" opacity="0.5" />
                  <circle cx="250" cy="110" r="6" fill="#00FF9F" opacity="0.5" />
                </g>
              </svg>

              {/* View Controls Overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <div className="bg-[#002d2a]/80 backdrop-blur-sm rounded-lg p-2 border border-[#00817A]/30">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <div className="bg-[#002d2a]/80 backdrop-blur-sm rounded-lg p-2 border border-[#00817A]/30">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Profiles List */}
          <div className="bg-[#003d3a] rounded-xl p-4 border border-[#00817A]/30">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h4 className="text-sm font-semibold text-white">Selected Profiles</h4>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'HEB 360', count: 24, selected: true },
                { name: 'IPE 220', count: 156, selected: true },
                { name: 'UNP 160', count: 89, selected: true },
                { name: 'L70-7', count: 234, selected: false },
              ].map((profile, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all animate-fade-in ${
                    profile.selected
                      ? 'bg-[#00817A]/20 border-[#00FF9F]/40'
                      : 'bg-[#002d2a] border-[#00817A]/20 opacity-50'
                  }`}
                  style={{
                    animationDelay: `${0.6 + idx * 0.1}s`,
                    animationDuration: '0.5s',
                    animationFillMode: 'both',
                  }}
                >
                  <div className="flex items-center gap-1">
                    {profile.selected ? (
                      <svg className="w-4 h-4 text-[#00FF9F]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs font-bold text-white text-center">{profile.name}</div>
                  <div className="text-xs text-gray-400">{profile.count} parts</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Callout */}
          <div className="mt-6 flex items-center justify-center gap-3 bg-[#00817A]/20 rounded-lg py-3 px-4 border border-[#00FF9F]/30">
            <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span className="text-white font-semibold">Click any profile to select</span>
            <span className="text-gray-400">•</span>
            <span className="text-[#00FF9F] font-bold">856 profiles ready for nesting</span>
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

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-fade-in {
          animation: fade-in forwards;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
              `}</style>
            </div>
          )
        }
