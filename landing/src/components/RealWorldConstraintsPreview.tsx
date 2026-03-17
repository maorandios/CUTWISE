const KerfIcon = () => (
  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h12" />
  </svg>
)
const TrimIcon = () => (
  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
  </svg>
)
const ToleranceIcon = () => (
  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)
const MiterIcon = () => (
  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h4V8h8V4" />
  </svg>
)

const items = [
  { label: 'Kerf', value: '3mm', icon: KerfIcon },
  { label: 'Trim', value: '5mm', icon: TrimIcon },
  { label: 'Tolerance', value: '15mm', icon: ToleranceIcon },
  { label: 'Miter', value: '26°', icon: MiterIcon },
]

export const RealWorldConstraintsPreview = () => (
  <div className="h-full min-h-full rounded-2xl p-5 border border-gray-200 bg-gray-50/50 flex items-center justify-center">
    <div className="grid grid-cols-2 w-full divide-x divide-y divide-gray-300">
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center gap-1.5 px-3 py-3"
        >
          <Icon />
          <div className="text-sm text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="text-base font-semibold text-gray-700">{value}</div>
        </div>
      ))}
    </div>
  </div>
)
