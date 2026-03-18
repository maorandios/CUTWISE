/* Thin-line 3D wireframe cube icon */
const Cube3DIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)

/* I-beam / HEA steel profile icon */
const SteelProfileIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="6" width="16" height="3" rx="0.5" />
    <rect x="4" y="15" width="16" height="3" rx="0.5" />
    <rect x="10" y="6" width="4" height="12" />
  </svg>
)

interface IFCToFabricationIllustrationProps {
  className?: string
}

export const IFCToFabricationIllustration = ({ className = '' }: IFCToFabricationIllustrationProps) => (
  <div className={`w-full h-full rounded-2xl border border-gray-200 bg-gray-50/50 flex items-center justify-center pt-[15px] px-5 pb-5 ${className}`}>
    <div className="flex flex-col items-center gap-10 w-full max-w-lg">
      {/* Top: Status badge - pill with turquoise accent, 15px from top card border */}
      <div className="inline-flex items-center gap-4 px-6 py-4 rounded-full border border-gray-200 bg-white">
        <span className="w-4 h-4 rounded-full bg-[#14B8A6]" />
        <span className="text-base font-medium text-gray-700">Workflow</span>
      </div>

      {/* Horizontal flow: left | arrow | right */}
      <div className="flex items-center justify-center gap-8 w-full">
        {/* Left: icon on top, text below */}
        <div className="flex flex-col items-center gap-3 text-gray-700">
          <Cube3DIcon />
          <span className="text-base font-medium">3D ifc model</span>
        </div>

        {/* Arrow */}
        <svg className="w-10 h-10 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>

        {/* Right: icon on top, text below */}
        <div className="flex flex-col items-center gap-3 text-gray-700">
          <SteelProfileIcon />
          <span className="text-base font-medium">Fabrication</span>
        </div>
      </div>
    </div>
  </div>
)
