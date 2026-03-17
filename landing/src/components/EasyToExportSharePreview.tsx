import { useEffect, useState } from 'react'

const exportOptions = [
  { format: 'Excel' },
  { format: 'PDF' },
]

const shareTargets = [
  { name: 'Purchasing' },
  { name: 'Planning' },
  { name: 'Shop floor' },
]

export const EasyToExportSharePreview = () => {
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Easy to export and share</div>
              <div className="text-lg font-bold text-white">One output, everyone aligned</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Export</div>
              <div className="flex gap-2">
                {exportOptions.map((opt) => (
                  <div
                    key={opt.format}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#003d3a]/60 border border-[#00817A]/30"
                  >
                    <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold text-white">{opt.format}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Share with</div>
              <div className="space-y-2">
                {shareTargets.map((target) => (
                  <div
                    key={target.name}
                    className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-[#003d3a]/60 border border-[#00817A]/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    <svg className="w-5 h-5 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="font-medium text-white">{target.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
