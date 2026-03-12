import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { ChevronRight, Search } from 'lucide-react'

interface Part {
  partNumber: string
  partName: string
  length: number
  quantity: number
  weight: number
}

interface ProfileParts {
  profileName: string
  parts: Part[]
}

interface PartSelectionProps {
  profilesData: ProfileParts[]
  onBack: () => void
  onContinue: (selectedParts: Map<string, Set<string>>) => void
}

export const PartSelection = ({ profilesData, onBack, onContinue }: PartSelectionProps) => {
  console.log('[PartSelection] Received profilesData:', profilesData)
  
  const [activeProfile, setActiveProfile] = useState<string>(profilesData[0]?.profileName || '')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Initialize all parts as selected
  const [selectedParts, setSelectedParts] = useState<Map<string, Set<string>>>(
    new Map(
      profilesData.map(profile => {
        console.log(`[PartSelection] Profile ${profile.profileName} has ${profile.parts.length} parts`)
        return [
          profile.profileName,
          new Set(profile.parts.map(p => p.partNumber))
        ]
      })
    )
  )

  const activeProfileData = profilesData.find(p => p.profileName === activeProfile)
  const activeProfileParts = activeProfileData?.parts || []
  const activeProfileSelected = selectedParts.get(activeProfile) || new Set()

  // Filter parts based on search and sort by part number (ascending)
  const filteredParts = activeProfileParts
    .filter(part =>
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Try to parse as numbers first for proper numeric sorting
      const aNum = parseInt(a.partNumber)
      const bNum = parseInt(b.partNumber)
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      
      // Fallback to string comparison
      return a.partNumber.localeCompare(b.partNumber, undefined, { numeric: true, sensitivity: 'base' })
    })

  const togglePart = (profileName: string, partNumber: string) => {
    setSelectedParts(prev => {
      const newMap = new Map(prev)
      const profileParts = new Set(newMap.get(profileName) || new Set())
      
      if (profileParts.has(partNumber)) {
        profileParts.delete(partNumber)
      } else {
        profileParts.add(partNumber)
      }
      
      newMap.set(profileName, profileParts)
      return newMap
    })
  }

  const toggleAllForProfile = (profileName: string, selectAll: boolean) => {
    setSelectedParts(prev => {
      const newMap = new Map(prev)
      const profile = profilesData.find(p => p.profileName === profileName)
      
      if (selectAll) {
        newMap.set(profileName, new Set(profile?.parts.map(p => p.partNumber) || []))
      } else {
        newMap.set(profileName, new Set())
      }
      
      return newMap
    })
  }

  const getSelectedCount = (profileName: string) => {
    return selectedParts.get(profileName)?.size || 0
  }

  const getTotalCount = (profileName: string) => {
    return profilesData.find(p => p.profileName === profileName)?.parts.length || 0
  }

  const allSelected = activeProfileSelected.size === activeProfileParts.length
  const totalSelectedParts = Array.from(selectedParts.values()).reduce(
    (sum, set) => sum + set.size,
    0
  )

  return (
    <div className="min-h-screen">
      {/* Header with full-width background */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Review & Select Parts</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Exclude parts from the nesting report
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button
                onClick={() => onContinue(selectedParts)}
                disabled={totalSelectedParts === 0}
              >
                Continue →
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1200px] mx-auto px-6 py-6 pb-12">

        {/* Split Screen Content */}
        <div className="flex gap-0">
        {/* Left Panel - Profile List */}
        <div className="w-80 flex flex-col border-r border-gray-200 pr-6">
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 310px)' }}>
              {profilesData.map(profile => {
                const selectedCount = getSelectedCount(profile.profileName)
                const totalCount = getTotalCount(profile.profileName)
                const isActive = profile.profileName === activeProfile

                return (
                  <button
                    key={profile.profileName}
                    onClick={() => setActiveProfile(profile.profileName)}
                    className={`w-full text-left py-4 px-3 border rounded-xl transition-all ${
                      isActive
                        ? 'border-[#00817A]'
                        : 'border-gray-200 hover:bg-white/50'
                    }`}
                    style={isActive ? { backgroundColor: 'rgba(0, 129, 122, 0.08)' } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">
                          {profile.profileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedCount} of {totalCount} parts
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-[#00817A] flex-shrink-0" />}
                    </div>
                  </button>
                )
              })}
          </div>
        </div>

        {/* Right Panel - Parts Table */}
        <div className="flex-1 flex flex-col bg-white pl-6">
          {/* Table Header */}
          <div className="px-0 pt-0 pb-3 border-b">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search part"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAllForProfile(activeProfile, !allSelected)}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          {/* Parts Table */}
          <div className="overflow-y-auto pb-6" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b">
                  <th className="w-16 px-6 py-3"></th>
                  <th className="w-1/6 text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    Part Number
                  </th>
                  <th className="w-1/6 text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    Part Name
                  </th>
                  <th className="w-1/6 text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    Length (mm)
                  </th>
                  <th className="w-1/6 text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    Quantity
                  </th>
                  <th className="w-1/6 text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    Weight (kg)
                  </th>
                  <th className="w-1/6 text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    Total Weight (kg)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part, index) => {
                  const isSelected = activeProfileSelected.has(part.partNumber)

                  return (
                    <tr
                      key={part.partNumber}
                      className={`border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                        !isSelected ? 'opacity-50' : ''
                      }`}
                      onClick={() => togglePart(activeProfile, part.partNumber)}
                    >
                      <td className="px-6 py-4">
                        <div className="relative flex-shrink-0 w-5 h-5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePart(activeProfile, part.partNumber)}
                            onClick={(e) => e.stopPropagation()}
                            className="appearance-none w-5 h-5 border-2 border-gray-300 rounded-full cursor-pointer transition-all checked:bg-[#00817A] checked:border-[#00817A] focus:ring-2 focus:ring-[#00817A] focus:ring-offset-1"
                          />
                          {isSelected && (
                            <svg 
                              className="absolute inset-0 w-5 h-5 text-white pointer-events-none p-1"
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-gray-400'}`}>
                          {part.partNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${isSelected ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {part.partName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                          {part.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                          {part.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                          {part.weight.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                          {(part.weight * part.quantity).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredParts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No parts found matching "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
