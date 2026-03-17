import { useEffect, useState } from 'react'

export const WorkflowPreview = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="w-full h-full bg-transparent flex items-center justify-center p-4 md:p-8">
      <div
        className={`w-full max-w-[95%] md:max-w-6xl transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-stretch justify-between gap-6 lg:gap-0">
          {/* Left: IFC Model */}
          <div className="w-full max-w-sm lg:max-w-none lg:min-w-0 flex items-stretch">
            <div className="w-full h-full min-h-[320px] lg:min-h-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#002d2a] to-[#001a18] p-6 border-2 border-[#00817A]/40 shadow-2xl flex flex-col">
              <div className="flex flex-col items-center text-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#00FF9F]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-white">IFC 3D Model</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Input</div>
              </div>
              {/* 3D wireframe model - clean warehouse structure */}
              <div className="relative flex-1 min-h-[180px] bg-[#003d3a] rounded-xl p-2 border border-[#00817A]/30 overflow-hidden w-full aspect-[5/3]">
                <div className="absolute inset-0 flex items-center justify-center p-2 overflow-hidden">
                <svg className="w-full h-full min-w-0 min-h-0" viewBox="13 16 144 80" fill="none" stroke="#00FF9F" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" preserveAspectRatio="xMidYMid meet" overflow="hidden">
                  <defs>
                    <filter id="wireframeGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g filter="url(#wireframeGlow)">
                  {/* Floor - clean isometric rectangle with margin */}
                  <path d="M45 88 L105 88 L125 68 L65 68 Z" strokeOpacity="0.5" />
                  <path d="M55 84 L95 84 L110 72 L70 72 Z" strokeOpacity="0.4" />
                  <path d="M55 84 L95 84 M70 72 L110 72 M55 84 L70 72 M95 84 L110 72" strokeOpacity="0.35" />
                  {/* Columns - 4x3 grid, perfectly vertical */}
                  <path d="M45 88 L45 52" strokeOpacity="0.95" />
                  <path d="M65 84 L65 48" strokeOpacity="0.95" />
                  <path d="M85 80 L85 44" strokeOpacity="0.95" />
                  <path d="M105 76 L105 40" strokeOpacity="0.95" />
                  <path d="M55 80 L55 44" strokeOpacity="0.9" />
                  <path d="M75 76 L75 40" strokeOpacity="0.9" />
                  <path d="M95 72 L95 36" strokeOpacity="0.9" />
                  <path d="M115 68 L115 32" strokeOpacity="0.9" />
                  <path d="M65 72 L65 36" strokeOpacity="0.85" />
                  <path d="M85 68 L85 32" strokeOpacity="0.85" />
                  <path d="M105 64 L105 28" strokeOpacity="0.85" />
                  <path d="M125 60 L125 24" strokeOpacity="0.85" />
                  {/* Roof beams - horizontal girders */}
                  <path d="M45 52 L65 48 L85 44 L105 40" strokeOpacity="1" />
                  <path d="M55 44 L75 40 L95 36 L115 32" strokeOpacity="1" />
                  <path d="M65 36 L85 32 L105 28 L125 24" strokeOpacity="1" />
                  <path d="M45 52 L55 44 L65 36" strokeOpacity="0.9" />
                  <path d="M65 48 L75 40 L85 32" strokeOpacity="0.9" />
                  <path d="M85 44 L95 36 L105 28" strokeOpacity="0.9" />
                  <path d="M105 40 L115 32 L125 24" strokeOpacity="0.9" />
                  {/* Roof plane */}
                  <path d="M45 52 L105 40 L125 24 L65 36 Z" strokeOpacity="0.7" />
                  <path d="M65 48 L85 44 L105 40 M55 44 L75 40 L95 36 L115 32" strokeOpacity="0.6" />
                  {/* Purlins - secondary roof beams */}
                  <path d="M55 48 L95 40 L115 36" strokeOpacity="0.55" />
                  <path d="M65 44 L95 36 L125 28" strokeOpacity="0.55" />
                  {/* Diagonal bracing - selective, 2 bays only */}
                  <path d="M45 88 L65 48 M65 88 L45 52" strokeOpacity="0.6" />
                  <path d="M85 80 L105 40 M105 80 L85 44" strokeOpacity="0.6" />
                  <path d="M75 76 L95 36 M95 76 L75 40" strokeOpacity="0.55" />
                  {/* Side walls - clean vertical planes */}
                  <path d="M45 88 L45 52 L65 48 L65 84 Z" strokeOpacity="0.55" />
                  <path d="M105 76 L105 40 L125 24 L125 60 Z" strokeOpacity="0.55" />
                  <path d="M65 72 L65 36 L85 32 L85 68 Z" strokeOpacity="0.5" />
                  <path d="M85 68 L85 32 L105 28 L105 64 Z" strokeOpacity="0.5" />
                  </g>
                </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Center: 3 electric lines flowing INTO engine from left, OUT to right */}
          <div className="hidden lg:flex items-center justify-center min-w-0 self-stretch">
            <div className="flex items-stretch w-full max-w-[320px] h-full min-h-[200px]">
              {/* 3 lines IN: from left card to engine - rounded corners, uniform width */}
              <svg className="flex-1 min-w-[80px] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <g stroke="#00817A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="nonScalingStroke">
                  <path d="M 0 20 L 35 20 L 65 35 L 100 35" />
                  <path d="M 0 50 L 100 50" />
                  <path d="M 0 80 L 35 80 L 65 65 L 100 65" />
                </g>
              </svg>
              {/* Optimizer Engine */}
              <div className="flex-shrink-0 flex items-center px-1">
                <div className="bg-gradient-to-br from-[#002d2a] to-[#001a18] rounded-2xl px-5 py-4 border-2 border-[#00FF9F]/50 shadow-2xl">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-[#00FF9F]/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="text-sm font-bold text-white">Optimizer</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Cutwise</div>
                  </div>
                </div>
              </div>
              {/* 3 lines OUT: from engine to right card - rounded corners, uniform width */}
              <svg className="flex-1 min-w-[80px] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <g stroke="#00817A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="nonScalingStroke">
                  <path d="M 0 35 L 35 35 L 65 20 L 100 20" />
                  <path d="M 0 50 L 100 50" />
                  <path d="M 0 65 L 35 65 L 65 80 L 100 80" />
                </g>
              </svg>
            </div>
          </div>

          {/* Mobile: Engine with vertical connectors */}
          <div className="lg:hidden flex flex-col items-center">
            <div className="w-px h-6 bg-[#00FF9F]/50" />
            <div className="w-2 h-2 rounded-full bg-[#00FF9F]/70 my-1" />
            <div className="bg-gradient-to-br from-[#002d2a] to-[#001a18] rounded-2xl p-5 border-2 border-[#00FF9F]/50 shadow-2xl">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 bg-[#00FF9F]/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-base font-bold text-white">Optimizer Engine</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Cutwise</div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#00FF9F]/70 my-1" />
            <div className="w-px h-6 bg-[#00FF9F]/50" />
          </div>

          {/* Right: Cutting List Output */}
          <div className="w-full max-w-sm lg:max-w-none lg:min-w-0 flex items-stretch">
            <div className="w-full h-full min-h-[320px] lg:min-h-0 bg-gradient-to-br from-[#002d2a] to-[#001a18] rounded-2xl p-6 border-2 border-[#00817A]/40 shadow-2xl flex flex-col">
              <div className="flex flex-col items-center text-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#00FF9F]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-white">Cutting List</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Output</div>
                <div className="mt-1">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Waste</div>
                  <div className="text-xl font-bold text-[#00FF9F]">0.22%</div>
                </div>
              </div>
              {/* Stock bar with parts */}
              <div className="flex-1 min-h-0 flex flex-col bg-[#003d3a] rounded-xl p-4 border border-[#00817A]/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">HEB360 · 12000mm</span>
                  <span className="text-xs text-[#ef4444] font-medium">27mm waste</span>
                </div>
                <svg viewBox="0 0 400 50" className="w-full h-auto" style={{ maxHeight: '60px' }}>
                  <defs>
                    <linearGradient id="workflowStockGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00817A" stopOpacity="0.15" />
                      <stop offset="96%" stopColor="#00817A" stopOpacity="0.15" />
                      <stop offset="96%" stopColor="#ef4444" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="400" height="50" fill="url(#workflowStockGrad)" rx="6" />
                  {/* Parts */}
                  {[
                    { x: 5, w: 55, label: 'B1' },
                    { x: 62, w: 48, label: 'B2' },
                    { x: 112, w: 52, label: 'B3' },
                    { x: 166, w: 58, label: 'B4' },
                    { x: 226, w: 50, label: 'B5' },
                    { x: 278, w: 55, label: 'B6' },
                    { x: 335, w: 45, label: 'B7' },
                  ].map((p, i) => (
                    <g key={i}>
                      <rect x={p.x} y="8" width={p.w - 4} height="34" fill="#00817A" fillOpacity="0.35" stroke="#00FF9F" strokeWidth="1.5" rx="3" />
                      <text x={p.x + (p.w - 4) / 2} y="28" textAnchor="middle" dominantBaseline="middle" fill="#00FF9F" fontSize="12" fontWeight="700">{p.label}</text>
                    </g>
                  ))}
                  {/* Waste */}
                  <rect x="382" y="8" width="14" height="34" fill="#ef4444" fillOpacity="0.5" stroke="#ef4444" strokeWidth="2" rx="3" strokeDasharray="4 2" />
                </svg>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'].map((name, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#00817A]/30 text-[#00FF9F] font-medium">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
