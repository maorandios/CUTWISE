import { useEffect, useState } from 'react'

const profiles = [
  { name: 'IPE 200', cuts: 12, bars: 3 },
  { name: 'HEB 360', cuts: 8, bars: 2 },
  { name: 'UPN 160', cuts: 6, bars: 2 },
  { name: 'RHS100*50*4', cuts: 5, bars: 1 },
  { name: 'C15X33.9', cuts: 4, bars: 1 },
]

export const GroupedByProfilePreview = () => {
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Grouped by profile</div>
              <div className="text-lg font-bold text-white">Cut list by section</div>
            </div>
          </div>
          <div className="space-y-2">
            {profiles.map((profile, idx) => (
              <div
                key={profile.name}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#003d3a]/60 border border-[#00817A]/30"
                style={{
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span className="font-semibold text-white">{profile.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">{profile.cuts} cuts</span>
                  <span className="text-[#00FF9F] font-medium">{profile.bars} stock bars</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
