const topics = [
  { name: 'Stock Bar BOM', subtitle: 'ready for supplier', icon: 'bom' },
  { name: 'Cutting Plan', subtitle: 'ready for production', icon: 'cut' },
  { name: 'Exportable CSV', subtitle: 'for saw input', icon: 'csv' },
  { name: 'Clean PDF reports', subtitle: 'for sharing', icon: 'pdf' },
]

const OutputIcon = () => (
  <svg className="w-8 h-8 text-[#002D2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)

const BOMIcon = () => (
  <svg className="w-6 h-6 text-[#002D2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const CutIcon = () => (
  <svg className="w-6 h-6 text-[#002D2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121" />
  </svg>
)
const CSVIcon = () => (
  <svg className="w-6 h-6 text-[#002D2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)
const PDFIcon = () => (
  <svg className="w-6 h-6 text-[#002D2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
)

const iconMap = { bom: BOMIcon, cut: CutIcon, csv: CSVIcon, pdf: PDFIcon }

const positions = [
  { left: '50%', top: '5%', x: '-50%' },
  { left: '15%', top: '25%', x: '-50%' },
  { left: '15%', top: '65%', x: '-50%' },
  { left: '85%', top: '25%', x: '-50%' },
  { left: '85%', top: '65%', x: '-50%' },
]

export const OutputsSection = () => (
  <section id="outputs" className="py-20 bg-background">
    <div className="container max-w-app mx-auto px-6">
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
          Outputs
        </span>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4 tracking-[-1px]">
        Everything You Need to Move Forward
      </h2>

      <div className="relative max-w-2xl mx-auto mt-16 min-h-[320px]">
        {/* Center icon */}
        <div
          className="absolute w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center z-10"
          style={{ left: '50%', bottom: '10%', transform: 'translateX(-50%)' }}
        >
          <OutputIcon />
        </div>

        {/* Topics with icons - positioned like the drawing */}
        {topics.map((topic, i) => {
          const pos = positions[i]
          const IconComponent = iconMap[topic.icon as keyof typeof iconMap]
          return (
            <div
              key={topic.name}
              className="absolute flex flex-col items-center z-10"
              style={{
                left: pos.left,
                top: pos.top,
                transform: `translate(${pos.x}, 0)`,
              }}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mb-2">
                <IconComponent />
              </div>
              <div className="text-center max-w-[120px]">
                <div className="text-sm font-semibold text-gray-900 leading-tight">{topic.name}</div>
                <div className="text-xs text-gray-500 leading-tight">({topic.subtitle})</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  </section>
)
