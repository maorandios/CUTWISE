import { useEffect, useState } from 'react'

const cutList = [
  { order: 1, length: '2450mm', position: '0mm', part: 'B-12' },
  { order: 2, length: '3120mm', position: '2450mm', part: 'B-08' },
  { order: 3, length: '1890mm', position: '5570mm', part: 'B-15' },
  { order: 4, length: '2180mm', position: '7460mm', part: 'B-03' },
]

export const ReadyForSawOperatorsPreview = () => {
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
              <div className="text-xs text-gray-400 uppercase tracking-wide">Ready for saw operators</div>
              <div className="text-lg font-bold text-white">Cut list — follow the order</div>
            </div>
          </div>
          <div className="rounded-xl bg-[#003d3a]/60 border border-[#00817A]/30 overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-[#003d3a]/40 text-xs text-gray-400 uppercase tracking-wide">
              <span>#</span>
              <span>Length</span>
              <span>Position</span>
              <span>Part</span>
            </div>
            {cutList.map((cut) => (
              <div
                key={cut.order}
                className="grid grid-cols-4 gap-2 px-4 py-3 border-t border-[#00817A]/20 items-center"
              >
                <span className="font-bold text-[#00FF9F]">{cut.order}</span>
                <span className="font-semibold text-white">{cut.length}</span>
                <span className="text-gray-400 text-sm">{cut.position}</span>
                <span className="text-gray-300 text-sm">{cut.part}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
