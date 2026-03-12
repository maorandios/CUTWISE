import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ChevronDown, ChevronUp, Plus, X, Package, Scissors } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
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

          {/* Quick Actions */}
          <div className="flex items-center gap-3 mt-4">
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
      </div>

      {/* Profile Cards */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {profileStocks.map((profile) => {
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
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-700"
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
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border-2 border-primary rounded-lg">
                          <Input
                            type="number"
                            placeholder="Length (mm)"
                            value={newStockLength}
                            onChange={(e) => setNewStockLength(e.target.value)}
                            className="w-28 h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => addStock(profile.profileName, 'purchased')}
                            className="h-7 px-2"
                          >
                            Add
                          </Button>
                          <button
                            onClick={() => setAddingStock(null)}
                            className="hover:bg-gray-200 rounded p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
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
                      <Scissors className="w-4 h-4 text-orange-600" />
                      <Label className="text-sm font-semibold text-gray-700">
                        Leftover Stock Lengths
                      </Label>
                      <span className="text-xs text-gray-500">(Priority usage)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.leftoverStocks.map((stock) => (
                        <div
                          key={stock.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-medium text-orange-700"
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
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border-2 border-primary rounded-lg">
                          <Input
                            type="number"
                            placeholder="Length (mm)"
                            value={newStockLength}
                            onChange={(e) => setNewStockLength(e.target.value)}
                            className="w-28 h-7 text-sm"
                            autoFocus
                          />
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={newStockQuantity}
                            onChange={(e) => setNewStockQuantity(e.target.value)}
                            className="w-16 h-7 text-sm"
                            min="1"
                          />
                          <Button
                            size="sm"
                            onClick={() => addStock(profile.profileName, 'leftover')}
                            className="h-7 px-2"
                          >
                            Add
                          </Button>
                          <button
                            onClick={() => {
                              setAddingStock(null)
                              setNewStockQuantity('1')
                            }}
                            className="hover:bg-gray-200 rounded p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
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
                      <div>
                        <Label className="text-sm font-semibold text-gray-700">
                          Mark as Complete
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Confirm you've finished configuring stock for this profile
                        </p>
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

      {/* Footer Actions */}
      <div className="bg-white border-t sticky bottom-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => onContinue(profileStocks)}
            >
              Skip - Use Defaults
            </Button>
            <Button
              onClick={() => onContinue(profileStocks)}
              disabled={!hasValidStocks}
            >
              Continue to Generate →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
