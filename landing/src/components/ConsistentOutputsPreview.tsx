export const ConsistentOutputsPreview = () => {
  const value = '450mm'
  return (
    <div className="h-full min-h-full rounded-2xl p-5 border border-gray-200 bg-gray-50/50 flex items-center justify-center">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">{value}</span>
            </div>
            <span className="text-xs text-gray-500">Run {i}</span>
          </div>
        ))}
        <span className="text-gray-400 text-sm font-medium shrink-0">≡</span>
      </div>
    </div>
  )
}
