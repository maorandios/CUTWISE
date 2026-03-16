import { useState } from 'react'
import { PayPalCheckout } from './PayPalCheckout'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  credits?: number
}

export function PaymentModal({ isOpen, onClose, credits = 0 }: PaymentModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<{type: string, credits: number, amount: number, name: string} | null>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => {
      onClose()
      setSelectedPlan(null)
    }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {!selectedPlan ? (
          // Step 1: Plan Selection
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
                <p className="text-gray-600 mt-2">
                  {credits === 0 
                    ? "You've run out of credits. Purchase more to continue using Cutwise."
                    : "Select the perfect credit package for your needs"
                  }
                </p>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {credits === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong className="font-semibold">No credits remaining.</strong> You need at least 1 credit to upload a new project.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {/* Single Use */}
              <div 
                onClick={() => setSelectedPlan({type: 'single', credits: 1, amount: 1.00, name: 'Single Use'})}
                className="group relative bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-gray-900 hover:shadow-xl transition-all duration-300"
              >
                <div className="space-y-4">
                  <div>
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-xl mb-4 group-hover:bg-gray-900/10 transition-colors">
                      <svg className="w-7 h-7 text-gray-600 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Single Use</h3>
                    <p className="text-gray-600 text-sm">Perfect for trying out our service</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-bold text-gray-900">€1</span>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">1 Project</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Everything Included:</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Export Bill of Materials</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Export Optimized Cutting Plan</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Materials Analysis</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Live 3D Model Profile Selection</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Project Metrics</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-gray-900 hover:bg-[#0A5048] text-white font-semibold py-3 rounded-xl transition-colors">
                    Select Plan
                  </button>
                </div>
              </div>

              {/* Light Pack - Popular */}
              <div 
                onClick={() => setSelectedPlan({type: 'pack_20', credits: 20, amount: 499.00, name: 'Light Pack'})}
                className="group relative bg-gradient-to-br from-gray-50 to-white border-2 border-gray-900 rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 scale-105"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
                  POPULAR
                </div>
                <div className="space-y-4 mt-2">
                  <div>
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900/10 rounded-xl mb-4 group-hover:bg-gray-900/20 transition-colors">
                      <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Light Pack</h3>
                    <p className="text-gray-600 text-sm">Best for regular users</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-gray-900">€499</span>
                    </div>
                    <p className="text-sm text-gray-900 font-semibold mb-4">Save 14% • €24.95 per project</p>
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">20 Projects</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Everything Included:</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Export Bill of Materials</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Export Optimized Cutting Plan</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Materials Analysis</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Live 3D Model Profile Selection</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Project Metrics</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors">
                    Select Plan
                  </button>
                </div>
              </div>

              {/* Heavy Pack - Best Value */}
              <div 
                onClick={() => setSelectedPlan({type: 'pack_50', credits: 50, amount: 999.00, name: 'Heavy Pack'})}
                className="group relative bg-gradient-to-br from-amber-50 to-white border-2 border-amber-400 rounded-2xl p-6 cursor-pointer hover:border-amber-500 hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
                  BEST VALUE
                </div>
                <div className="space-y-4 mt-2">
                  <div>
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-xl mb-4 group-hover:bg-amber-200 transition-colors">
                      <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Heavy Pack</h3>
                    <p className="text-gray-600 text-sm">Maximum savings for power users</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-gray-900">€999</span>
                    </div>
                    <p className="text-sm text-amber-600 font-semibold mb-4">Save 31% • €19.98 per project</p>
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">50 Projects</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Everything Included:</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Export Bill of Materials</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Export Optimized Cutting Plan</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Materials Analysis</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Live 3D Model Profile Selection</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                          </svg>
                          <span className="text-xs text-gray-700 leading-tight">Project Metrics</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg">
                    Select Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">SSL Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0070ba]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.29c-.44 0-.77-.36-.656-.793l2.4-15.213c.067-.42.44-.73.866-.73h4.92c.94 0 1.67.08 2.23.26.48.15.89.37 1.23.68.34.3.6.67.78 1.1z" />
                      <path d="M7.27 3.11c.07-.43.44-.73.87-.73h5.7c1.95 0 3.27.4 4.02 1.42.36.48.58 1.05.68 1.74.1.7.08 1.54-.08 2.54v.01c-.74 3.81-3.28 5.13-6.52 5.13h-.5c-.44 0-.82.32-.87.75l-.72 4.56c-.06.4-.4.69-.8.69H6.6c-.44 0-.77-.36-.66-.79L7.27 3.11z" opacity=".7" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">PayPal Protected</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center max-w-2xl">
                  All payments are processed securely through PayPal. Your financial information is never stored on our servers. 
                  PayPal's buyer protection ensures your purchase is safe and secure.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Step 2: Payment
          <div className="p-8 relative">
            {/* Close button - absolute positioned */}
            <button 
              onClick={() => {
                onClose()
                setSelectedPlan(null)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="max-w-md mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Complete Your Purchase</h2>
                  <p className="text-gray-600 mt-2">You selected: {selectedPlan.name} - {selectedPlan.credits} Credits</p>
                </div>
              </div>

            
              <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Plan</span>
                    <span className="font-semibold">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Credits</span>
                    <span className="font-semibold">{selectedPlan.credits}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total</span>
                      <span>€{selectedPlan.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Payment Method</h3>
                <div className="mb-4">
                  <PayPalCheckout 
                    planType={selectedPlan.type} 
                    credits={selectedPlan.credits} 
                    amount={selectedPlan.amount}
                    onSuccess={() => {
                      onClose()
                      setSelectedPlan(null)
                    }}
                  />
                </div>
              </div>
            
              {/* Trust Footer */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">SSL Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#0070ba]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.29c-.44 0-.77-.36-.656-.793l2.4-15.213c.067-.42.44-.73.866-.73h4.92c.94 0 1.67.08 2.23.26.48.15.89.37 1.23.68.34.3.6.67.78 1.1z" />
                        <path d="M7.27 3.11c.07-.43.44-.73.87-.73h5.7c1.95 0 3.27.4 4.02 1.42.36.48.58 1.05.68 1.74.1.7.08 1.54-.08 2.54v.01c-.74 3.81-3.28 5.13-6.52 5.13h-.5c-.44 0-.82.32-.87.75l-.72 4.56c-.06.4-.4.69-.8.69H6.6c-.44 0-.77-.36-.66-.79L7.27 3.11z" opacity=".7" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">PayPal Protected</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    All payments are processed securely through PayPal. Your financial information is never stored on our servers. 
                    PayPal's buyer protection ensures your purchase is safe and secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
