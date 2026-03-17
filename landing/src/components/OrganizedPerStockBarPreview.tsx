import { useEffect, useState } from 'react'

const stockBars = [
  { id: 1, length: '12000mm', profile: 'HEB 360', cuts: ['2450', '3120', '1890', '2180'], waste: '27mm' },
  { id: 2, length: '12000mm', profile: 'HEB 360', cuts: ['2560', '2890', '2100'], waste: '45mm' },
  { id: 3, length: '6000mm', profile: 'IPE 200', cuts: ['1850', '2100', '1920'], waste: '130mm' },
]

export const OrganizedPerStockBarPreview = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="w-full h-full bg-transparent flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-gradient-to-br from-[#002d2a] to-[#001a18] rounded-2xl p-6 border-2 border-[#00817A]/40 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#00FF9F]/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Organized per stock bar</div>
              <div className="text-lg font-bold text-white">Each bar, its cuts & waste</div>
            </div>
          </div>
          <div className="space-y-3">
            {stockBars.map((bar) => (
              <div
                key={bar.id}
                className="rounded-xl bg-[#003d3a]/60 border border-[#00817A]/30 overflow-hidden"
              >
                <div className="flex items-center justify-between py-2.5 px-4 bg-[#003d3a]/40">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    <span className="font-semibold text-white">Stock bar #{bar.id}</span>
                    <span className="text-gray-400 text-sm">{bar.length}</span>
                  </div>
                  <span className="text-[#ef4444] text-sm font-medium">{bar.waste} waste</span>
                </div>
                <div className="px-4 py-2 flex flex-wrap gap-2">
                  {bar.cuts.map((cut, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-[#00FF9F]/10 text-[#00FF9F] text-sm font-medium"
                    >
                      {cut}mm
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
