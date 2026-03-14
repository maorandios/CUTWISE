import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp, Plus, X, Package, Recycle, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NestingBottomNav } from './NestingBottomNav'

interface StockLength {
  id: string
  length: number
  quantity?: number // Only for leftovers
}

interface ProfileStock {
  profileName: string
  partCount: number
  totalLength: number
  totalWeight: number
  purchasedStocks: StockLength[]
  leftoverStocks: StockLength[]
  isComplete: boolean
  maxPartLength?: number
}

interface StockAssignmentProps {
  profiles: { name: string; partCount: number; totalLength: number; totalWeight: number; maxPartLength?: number }[]
  defaultStockLengths?: { id: number; value: number }[]
  onBack: () => void
  onContinue: (stockConfig: ProfileStock[]) => void
}

export const StockAssignment = ({ profiles, defaultStockLengths, onBack, onContinue }: StockAssignmentProps) => {
  // Initialize stock configuration for each profile using default stock lengths from settings
  const [profileStocks, setProfileStocks] = useState<ProfileStock[]>(
    profiles.map((profile, index) => ({
      profileName: profile.name,
      partCount: profile.partCount,
      totalLength: profile.totalLength,
      totalWeight: profile.totalWeight,
      maxPartLength: profile.maxPartLength,
      purchasedStocks: (defaultStockLengths || [
        { id: 1, value: 6000 },
        { id: 2, value: 12000 }
      ])
        .sort((a, b) => b.value - a.value) // Sort descending (largest to smallest)
        .map((stock, idx) => ({
          id: `${profile.name}-p-${idx + 1}`,
          length: stock.value
        })),
      leftoverStocks: [],
      isComplete: false
    }))
  )

  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(
    new Set([profiles[0]?.name])
  )

  const [addingStock, setAddingStock] = useState<{
    profileName: string
    type: 'purchased' | 'leftover'
  } | null>(null)

  const [newStockLength, setNewStockLength] = useState('')
  const [newStockQuantity, setNewStockQuantity] = useState('1')
  const addStockRef = useRef<HTMLDivElement>(null)
  const [filterCompletion, setFilterCompletion] = useState<'all' | 'complete' | 'incomplete'>('all')
  const [selectedProfileFilter, setSelectedProfileFilter] = useState<Set<string>>(new Set())
  const [isProfileFilterOpen, setIsProfileFilterOpen] = useState(false)
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const profileFilterRef = useRef<HTMLDivElement>(null)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false)
  const [showStockWarning, setShowStockWarning] = useState(false)
  const [stockWarnings, setStockWarnings] = useState<Array<{
    profile: string
    maxPart: number
    maxStock: number
  }>>([])
  const [approvedWarnings, setApprovedWarnings] = useState<Set<string>>(new Set())

  const toggleProfile = (profileName: string) => {
    setExpandedProfiles(prev => {
      const next = new Set(prev)
      if (next.has(profileName)) {
        next.delete(profileName)
      } else {
        next.add(profileName)
      }
      return next
    })
  }

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileFilterRef.current && !profileFilterRef.current.contains(event.target as Node)) {
        setIsProfileFilterOpen(false)
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setIsStatusFilterOpen(false)
      }
      // Handle add stock input - save and close when clicking outside
      if (addStockRef.current && !addStockRef.current.contains(event.target as Node) && addingStock) {
        const length = parseFloat(newStockLength)
        if (length && length >= 500 && length <= 18000) {
          if (addingStock.type === 'leftover') {
            const quantity = parseInt(newStockQuantity)
            if (quantity && quantity >= 1) {
              addStock(addingStock.profileName, addingStock.type)
            } else {
              // Invalid quantity, just close
              setAddingStock(null)
              setNewStockLength('')
              setNewStockQuantity('1')
            }
          } else {
            addStock(addingStock.profileName, addingStock.type)
          }
        } else {
          // Invalid length, just close without saving
          setAddingStock(null)
          setNewStockLength('')
          setNewStockQuantity('1')
        }
      }
    }

    if (isProfileFilterOpen || isStatusFilterOpen || addingStock) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileFilterOpen, isStatusFilterOpen, addingStock, newStockLength, newStockQuantity])

  const removeStock = (profileName: string, stockId: string, type: 'purchased' | 'leftover') => {
    setProfileStocks(prev =>
      prev.map(profile => {
        if (profile.profileName === profileName) {
          let updatedProfile = { ...profile }
          
          if (type === 'purchased') {
            updatedProfile.purchasedStocks = profile.purchasedStocks.filter(s => s.id !== stockId)
          } else {
            updatedProfile.leftoverStocks = profile.leftoverStocks.filter(s => s.id !== stockId)
          }
          
          // Auto-uncheck complete if no stocks remain
          if (updatedProfile.purchasedStocks.length === 0 && updatedProfile.leftoverStocks.length === 0) {
            updatedProfile.isComplete = false
          }
          
          return updatedProfile
        }
        return profile
      })
    )
  }

  const addStock = (profileName: string, type: 'purchased' | 'leftover') => {
    const length = parseFloat(newStockLength)
    if (!length || length < 500 || length > 18000) {
      return
    }

    const quantity = type === 'leftover' ? parseInt(newStockQuantity) : undefined
    if (type === 'leftover' && (!quantity || quantity < 1)) {
      return
    }

    setProfileStocks(prev =>
      prev.map(profile => {
        if (profile.profileName === profileName) {
          const newStock: StockLength = {
            id: `${profileName}-${type[0]}-${Date.now()}`,
            length,
            quantity
          }

          if (type === 'purchased') {
            // Check for duplicates
            if (profile.purchasedStocks.some(s => s.length === length)) {
              return profile
            }
            return {
              ...profile,
              purchasedStocks: [...profile.purchasedStocks, newStock].sort((a, b) => b.length - a.length)
            }
          } else {
            return {
              ...profile,
              leftoverStocks: [...profile.leftoverStocks, newStock].sort((a, b) => b.length - a.length)
            }
          }
        }
        return profile
      })
    )

    setAddingStock(null)
    setNewStockLength('')
    setNewStockQuantity('1')
  }

  const toggleComplete = (profileName: string) => {
    const profile = profileStocks.find(p => p.profileName === profileName)
    if (!profile) return

    // If already complete, just toggle to incomplete (allow editing again)
    if (profile.isComplete) {
      setProfileStocks(prev =>
        prev.map(p =>
          p.profileName === profileName
            ? { ...p, isComplete: false }
            : p
        )
      )
      // Clear approved warning when user edits again
      setApprovedWarnings(prev => {
        const next = new Set(prev)
        next.delete(profileName)
        return next
      })
      return
    }

    // If marking as complete, validate stock lengths first
    if (!profile.maxPartLength) {
      // No validation needed, just mark complete
      setProfileStocks(prev =>
        prev.map(p =>
          p.profileName === profileName
            ? { ...p, isComplete: true }
            : p
        )
      )
      return
    }

    const allStocks = [
      ...profile.purchasedStocks.map(s => s.length),
      ...profile.leftoverStocks.map(s => s.length)
    ]

    if (allStocks.length === 0) return

    const maxStock = Math.max(...allStocks)

    if (profile.maxPartLength > maxStock) {
      // Show warning modal
      setStockWarnings([{
        profile: profile.profileName,
        maxPart: profile.maxPartLength,
        maxStock
      }])
      setShowStockWarning(true)
    } else {
      // Valid, mark as complete
      setProfileStocks(prev =>
        prev.map(p =>
          p.profileName === profileName
            ? { ...p, isComplete: true }
            : p
        )
      )
    }
  }

  const useDefaultsForAll = () => {
    setProfileStocks(prev =>
      prev.map(profile => ({
        ...profile,
        purchasedStocks: (defaultStockLengths || [
          { id: 1, value: 6000 },
          { id: 2, value: 12000 }
        ])
          .sort((a, b) => b.value - a.value) // Sort descending (largest to smallest)
          .map((stock, idx) => ({
            id: `${profile.profileName}-p-${idx + 1}`,
            length: stock.value
          })),
        leftoverStocks: []
      }))
    )
  }

  const clearAll = () => {
    setProfileStocks(prev =>
      prev.map(profile => ({
        ...profile,
        purchasedStocks: [],
        leftoverStocks: [],
        isComplete: false
      }))
    )
  }

  const hasValidStocks = profileStocks.every(
    profile => profile.isComplete
  )

  const validateStockLengths = (): Array<{profile: string, maxPart: number, maxStock: number}> => {
    const issues: Array<{profile: string, maxPart: number, maxStock: number}> = []
    
    profileStocks.forEach(profile => {
      // Skip profiles that user already approved
      if (approvedWarnings.has(profile.profileName)) return
      
      if (!profile.maxPartLength) return
      
      const allStocks = [
        ...profile.purchasedStocks.map(s => s.length),
        ...profile.leftoverStocks.map(s => s.length)
      ]
      
      if (allStocks.length === 0) return
      
      const maxStock = Math.max(...allStocks)
      
      if (profile.maxPartLength > maxStock) {
        issues.push({
          profile: profile.profileName,
          maxPart: profile.maxPartLength,
          maxStock
        })
      }
    })
    
    return issues
  }

  const toggleProfileFilter = (profileName: string) => {
    setSelectedProfileFilter(prev => {
      const next = new Set(prev)
      if (next.has(profileName)) {
        next.delete(profileName)
      } else {
        next.add(profileName)
      }
      return next
    })
  }

  const filteredProfiles = profileStocks.filter(profile => {
    // Filter by completion status
    if (filterCompletion === 'complete' && !profile.isComplete) return false
    if (filterCompletion === 'incomplete' && profile.isComplete) return false
    
    // Filter by profile type (if any selected)
    if (selectedProfileFilter.size > 0 && !selectedProfileFilter.has(profile.profileName)) {
      return false
    }
    
    return true
  })

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Profile Cards */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '80px' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-4">
        {/* Filter and Quick Actions */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Profile Type Filter - Multi-select */}
            <div className="relative" ref={profileFilterRef}>
              <button
                onClick={() => setIsProfileFilterOpen(!isProfileFilterOpen)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer flex items-center gap-2"
              >
                <span>
                  Profile Type {selectedProfileFilter.size > 0 && `(${selectedProfileFilter.size})`}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isProfileFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isProfileFilterOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-y-auto">
                  {selectedProfileFilter.size > 0 && (
                    <div className="border-b p-2">
                      <button
                        onClick={() => setSelectedProfileFilter(new Set())}
                        className="w-full px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                  <div className="p-2 space-y-1">
                    {profileStocks.map((profile) => (
                      <label
                        key={profile.profileName}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <div className="relative flex-shrink-0 w-5 h-5">
                          <input
                            type="checkbox"
                            checked={selectedProfileFilter.has(profile.profileName)}
                            onChange={() => toggleProfileFilter(profile.profileName)}
                            className="peer absolute opacity-0 w-5 h-5 cursor-pointer"
                          />
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#00817A] peer-checked:bg-[#00817A] transition-all flex items-center justify-center">
                            {selectedProfileFilter.has(profile.profileName) && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-700">{profile.profileName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Completion Status Filter */}
            <div className="relative" ref={statusFilterRef}>
              <button
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer flex items-center gap-2"
              >
                <span>
                  {filterCompletion === 'all' && 'All Status'}
                  {filterCompletion === 'complete' && 'Complete'}
                  {filterCompletion === 'incomplete' && 'Incomplete'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStatusFilterOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 min-w-[160px]">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setFilterCompletion('all')
                        setIsStatusFilterOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm ${
                        filterCompletion === 'all' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      All Status
                    </button>
                    <button
                      onClick={() => {
                        setFilterCompletion('complete')
                        setIsStatusFilterOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm ${
                        filterCompletion === 'complete' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => {
                        setFilterCompletion('incomplete')
                        setIsStatusFilterOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm ${
                        filterCompletion === 'incomplete' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      Incomplete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={useDefaultsForAll}
              className="text-xs"
            >
              Use Defaults for All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>

        {filteredProfiles.map((profile) => {
          const isExpanded = expandedProfiles.has(profile.profileName)
          const hasNoStocks = profile.purchasedStocks.length === 0 && profile.leftoverStocks.length === 0

          return (
            <div
              key={profile.profileName}
              className={`rounded-xl border-2 transition-all ${
                hasNoStocks 
                  ? 'border-red-200 bg-white' 
                  : profile.isComplete 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-white'
              }`}
            >
              {/* Profile Header */}
              <button
                onClick={() => toggleProfile(profile.profileName)}
                className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                  profile.isComplete ? 'hover:bg-green-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    profile.isComplete ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profile.profileName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {profile.partCount} parts • Total length: {(profile.totalLength / 1000).toFixed(1)}m • Weight: {(profile.totalWeight / 1000).toFixed(2)}t
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hasNoStocks && (
                    <span className="text-xs text-red-600 font-medium">
                      ⚠️ No stock assigned
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Profile Content */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-6 border-t">
                  {/* Purchased Stock Lengths */}
                  <div className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-green-600" />
                      <Label className="text-sm font-semibold text-gray-700">
                        Purchased Stock Lengths
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Standard lengths available from your supplier (e.g., 6m, 12m bars)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.purchasedStocks.map((stock) => (
                        <div
                          key={stock.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-gray-200 rounded-lg text-sm font-medium text-green-700"
                        >
                          <span>{stock.length.toLocaleString()}mm</span>
                          {!profile.isComplete && (
                            <button
                              onClick={() => removeStock(profile.profileName, stock.id, 'purchased')}
                              className="hover:bg-green-200 rounded p-0.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add Purchased Stock */}
                      {!profile.isComplete && (
                        <>
                          {addingStock?.profileName === profile.profileName &&
                          addingStock?.type === 'purchased' ? (
                            <div ref={addStockRef} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-gray-300">
                              <Input
                                type="number"
                                placeholder="Length (mm)"
                                value={newStockLength}
                                onChange={(e) => setNewStockLength(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addStock(profile.profileName, 'purchased')
                                  }
                                }}
                                className="w-28 h-7 text-sm border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-400"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setAddingStock({ profileName: profile.profileName, type: 'purchased' })
                              }
                              className="inline-flex items-center gap-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Leftover Stock Lengths */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Recycle className="w-4 h-4 text-orange-600" />
                      <Label className="text-sm font-semibold text-gray-700">
                        Leftover Stock Lengths
                      </Label>
                      <span className="text-xs text-gray-500">(Priority usage)</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Existing pieces from inventory that will be used first to minimize waste
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.leftoverStocks.map((stock) => (
                        <div
                          key={stock.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 border border-gray-200 rounded-lg text-sm font-medium text-orange-700"
                        >
                          <span>{stock.length.toLocaleString()}mm</span>
                          <span className="text-xs bg-orange-200 px-1.5 py-0.5 rounded">
                            ×{stock.quantity}
                          </span>
                          {!profile.isComplete && (
                            <button
                              onClick={() => removeStock(profile.profileName, stock.id, 'leftover')}
                              className="hover:bg-orange-200 rounded p-0.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add Leftover Stock */}
                      {!profile.isComplete && (
                        <>
                          {addingStock?.profileName === profile.profileName &&
                          addingStock?.type === 'leftover' ? (
                            <div ref={addStockRef} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-gray-300">
                              <Input
                                type="number"
                                placeholder="Length (mm)"
                                value={newStockLength}
                                onChange={(e) => setNewStockLength(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addStock(profile.profileName, 'leftover')
                                  }
                                }}
                                className="w-28 h-7 text-sm border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-400"
                                autoFocus
                              />
                              <span className="text-gray-300">|</span>
                              <span className="text-sm text-gray-500">Qty:</span>
                              <Input
                                type="number"
                                placeholder="1"
                                value={newStockQuantity}
                                onChange={(e) => setNewStockQuantity(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addStock(profile.profileName, 'leftover')
                                  }
                                }}
                                className="w-12 h-7 text-sm border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-400"
                                min="1"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setAddingStock({ profileName: profile.profileName, type: 'leftover' })
                              }
                              className="inline-flex items-center gap-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add Leftover
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Complete Button */}
                  <div className="pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${hasNoStocks ? 'text-gray-300' : profile.isComplete ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <Label className={`text-sm font-semibold ${hasNoStocks ? 'text-gray-400' : 'text-gray-700'}`}>
                            {profile.isComplete ? 'Configuration Complete' : 'Mark as Complete'}
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            {hasNoStocks 
                              ? 'Add at least one stock length to mark as complete' 
                              : profile.isComplete 
                                ? 'Click Edit to modify this configuration'
                                : 'Confirm you\'ve finished configuring stock for this profile'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => toggleComplete(profile.profileName)}
                        disabled={hasNoStocks}
                        variant={profile.isComplete ? "outline" : "default"}
                        size="sm"
                      >
                        {profile.isComplete ? 'Edit' : 'Complete'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>

    {/* Incomplete Profiles Warning Modal */}
    <Dialog open={showIncompleteWarning} onOpenChange={setShowIncompleteWarning}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 shrink-0 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="space-y-3 min-w-0">
              <DialogTitle className="text-xl font-semibold text-gray-900 tracking-tight">Incomplete Configuration</DialogTitle>
              <DialogDescription className="text-base text-gray-600 leading-relaxed">
                To generate the nesting report, mark all profile types as complete. For each profile, add stock lengths and click the &quot;Complete&quot; button.
              </DialogDescription>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end">
          <Button onClick={() => setShowIncompleteWarning(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Stock Length Warning Modal */}
    <Dialog open={showStockWarning} onOpenChange={setShowStockWarning}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 shrink-0 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="space-y-3 min-w-0">
              <DialogTitle className="text-xl font-semibold text-gray-900 tracking-tight">Stock Length Insufficient</DialogTitle>
              <DialogDescription className="text-base text-gray-600 leading-relaxed">
                Some parts exceed your configured stock lengths. They will appear in the error table.
              </DialogDescription>
            </div>
          </div>
        </div>
        <div className="px-6 pb-4">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Affected profiles</p>
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 divide-y divide-gray-200/80">
            {stockWarnings.map((warning, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 px-4 text-sm">
                <span className="font-medium text-gray-900">{warning.profile}</span>
                <span className="text-gray-600 tabular-nums text-right">
                  {warning.maxPart.toLocaleString()}mm part → {warning.maxStock.toLocaleString()}mm max stock
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowStockWarning(false)}>
            Go Back
          </Button>
          <Button
            onClick={() => {
              // Mark the profile as complete even though stock length is insufficient
              if (stockWarnings.length > 0) {
                const profileName = stockWarnings[0].profile
                setProfileStocks(prev =>
                  prev.map(p =>
                    p.profileName === profileName
                      ? { ...p, isComplete: true }
                      : p
                  )
                )
                // Track that user approved this warning
                setApprovedWarnings(prev => new Set(prev).add(profileName))
              }
              setShowStockWarning(false)
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Save anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Bottom Navigation */}
    <NestingBottomNav
      currentStep={3}
      onBack={onBack}
      onContinue={() => {
        if (!hasValidStocks) {
          setShowIncompleteWarning(true)
        } else {
          const warnings = validateStockLengths()
          if (warnings.length > 0) {
            setStockWarnings(warnings)
            setShowStockWarning(true)
          } else {
            onContinue(profileStocks)
          }
        }
      }}
      continueText="Complete"
    />
    </div>
  )
}
