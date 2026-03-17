const Cube3DIcon = () => (
  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)
const DocumentIcon = () => (
  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

export const SimpleProcessPreview = () => (
  <div className="h-full min-h-full rounded-2xl p-5 border border-gray-200 bg-gray-50/50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2.5 text-gray-700">
        <Cube3DIcon />
        <span className="text-sm font-medium">3D ifc model</span>
      </div>
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#002D2A] text-gray-700">
        <DocumentIcon />
        <span className="text-sm font-medium">Purches and produce</span>
      </div>
    </div>
  </div>
)
