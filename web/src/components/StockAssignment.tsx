import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ChevronDown, ChevronUp, Plus, X, Package, Recycle, CheckCircle2 } from 'lucide-react'

interface StockLength {
  id: string
  length: number
  quantity?: number // Only for leftovers
}

interface ProfileStock {
  profileName: string
  partCount: number
  totalLength: number
  purchasedStocks: StockLength[]
  leftoverStocks: StockLength[]
  isComplete: boolean
}

interface StockAssignmentProps {
  profiles: { name: string; partCount: number; totalLength: number }[]
  onBack: () => void
  onContinue: (stockConfig: ProfileStock[]) => void
}

export const StockAssignment = ({ profiles, onBack, onContinue }: StockAssignmentProps) => {
  // Initialize stock configuration for each profile
  const [profileStocks, setProfileStocks] = useState<ProfileStock[]>(
    profiles.map((profile, index) => ({
      profileName: profile.name,
      partCount: profile.partCount,
      totalLength: profile.totalLength,
      purchasedStocks: [
        { id: `${profile.name}-p-1`, length: 6000 },
        { id: `${profile.name}-p-2`, length: 12000 }
      ],
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
          if (type === 'purchased') {
            return {
              ...profile,
              purchasedStocks: profile.purchasedStocks.filter(s => s.id !== stockId)
            }
          } else {
            return {
              ...profile,
              leftoverStocks: profile.leftoverStocks.filter(s => s.id !== stockId)
            }
          }
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
              purchasedStocks: [...profile.purchasedStocks, newStock]
            }
          } else {
            return {
              ...profile,
              leftoverStocks: [...profile.leftoverStocks, newStock]
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
    setProfileStocks(prev =>
      prev.map(profile =>
        profile.profileName === profileName
          ? { ...profile, isComplete: !profile.isComplete }
          : profile
      )
    )
  }

  const useDefaultsForAll = () => {
    setProfileStocks(prev =>
      prev.map(profile => ({
        ...profile,
        purchasedStocks: [
          { id: `${profile.profileName}-p-1`, length: 6000 },
          { id: `${profile.profileName}-p-2`, length: 12000 }
        ],
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
    profile => profile.purchasedStocks.length > 0 || profile.leftoverStocks.length > 0
  )

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
      {/* Header */}
      <div className="bg-gray-100 border-b sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configure Stock Lengths</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Assign available stock lengths for each profile type
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button
                onClick={() => onContinue(profileStocks)}
                disabled={!hasValidStocks}
              >
                Generate Nesting
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Cards */}
      <div className="flex-1 overflow-y-auto">
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
              className={`bg-white rounded-xl border-2 transition-all ${
                hasNoStocks ? 'border-red-200' : 'border-gray-200'
              }`}
            >
              {/* Profile Header */}
              <button
                onClick={() => toggleProfile(profile.profileName)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
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
                      {profile.partCount} parts • Total length: {(profile.totalLength / 1000).toFixed(1)}m
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
                    <div className="flex flex-wrap gap-2">
                      {profile.purchasedStocks.map((stock) => (
                        <div
                          key={stock.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-gray-200 rounded-lg text-sm font-medium text-green-700"
                        >
                          <span>{stock.length}mm</span>
                          <button
                            onClick={() => removeStock(profile.profileName, stock.id, 'purchased')}
                            className="hover:bg-green-200 rounded p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Add Purchased Stock */}
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
                    <div className="flex flex-wrap gap-2">
                      {profile.leftoverStocks.map((stock) => (
                        <div
                          key={stock.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 border border-gray-200 rounded-lg text-sm font-medium text-orange-700"
                        >
                          <span>{stock.length}mm</span>
                          <span className="text-xs bg-orange-200 px-1.5 py-0.5 rounded">
                            ×{stock.quantity}
                          </span>
                          <button
                            onClick={() => removeStock(profile.profileName, stock.id, 'leftover')}
                            className="hover:bg-orange-200 rounded p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Add Leftover Stock */}
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
                    </div>
                    {profile.leftoverStocks.length === 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Add leftover pieces from your yard to reduce waste
                      </p>
                    )}
                  </div>

                  {/* Complete Toggle */}
                  <div className="pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">
                            Mark as Complete
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Confirm you've finished configuring stock for this profile
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={profile.isComplete}
                        onCheckedChange={() => toggleComplete(profile.profileName)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
