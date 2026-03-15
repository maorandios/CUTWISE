import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { NestingReport as NestingReportType, SteelReport } from '../types'
import { pdf } from '@react-pdf/renderer'
import { NestingReportPDF } from './NestingReportPDF'
import { BOMPDF } from './BOMPDF'
import IFCViewerWebIFC from './IFCViewerWebIFC'
import { apiRequest, getBackendUrl } from '../utils/api'
import * as ProjectStorage from '../utils/projectStorage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Recycle } from 'lucide-react'
import { LottieLoader } from './LottieLoader'
import { AnimatedMetricCards } from './AnimatedMetricCards'
import { AnimatedBOMMetricCards } from './AnimatedBOMMetricCards'
import { AnimatedCuttingMetricCards } from './AnimatedCuttingMetricCards'
import { PartSelection } from './PartSelection'
import { StockAssignment } from './StockAssignment'
import { NestingBottomNav } from './NestingBottomNav'

interface NestingReportProps {
  filename: string
  ifcStorageKey?: string | null
  projectName?: string // Custom project name (overrides filename)
  nestingReport: NestingReportType | null
  onNestingReportChange: (report: NestingReportType | null) => void
  report: SteelReport | null  // Report data to get available profiles
  initialView?: 'select' | 'results' // Control which view to show initially
  onSettingsClick?: (handler: () => void) => void // Callback to expose settings handler to parent
  onModelReady?: () => void // Callback when IFC model is loaded and ready
  companyDetails?: {
    companyName: string
    address: string
    country: string
    phoneNumber: string
    email: string
  }
  nestingSettings?: {
    kerf: number
    trim: number
    toleranceEnabled: boolean
    tolerance: number
    stockLengths: { id: number; value: number }[]
  }
}

type Step = 'select' | 'part-selection' | 'stock-assignment' | 'results'

// Memoized ProfileItem component to prevent unnecessary re-renders
interface ProfileItemProps {
  profile: { profile_name: string; piece_count: number; total_weight: number }
  isSelected: boolean
  onToggle: (profileName: string) => void
}

const ProfileItem = memo(({ profile, isSelected, onToggle }: ProfileItemProps) => {
  const handleChange = useCallback(() => {
    onToggle(profile.profile_name)
  }, [onToggle, profile.profile_name])

  return (
    <label
      className={`block py-4 px-3 border rounded-xl cursor-pointer transition-colors ${
        isSelected
          ? 'border-[#00817A]'
          : 'border-gray-200 hover:bg-white/50'
      }`}
      style={isSelected ? { backgroundColor: 'rgba(0, 129, 122, 0.08)' } : {}}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0 w-5 h-5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleChange}
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
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">
            <span className="font-semibold">{profile.profile_name}</span>
            <span className="text-gray-500"> • {profile.piece_count} parts • {profile.total_weight.toLocaleString('en-US')} kg</span>
          </div>
        </div>
      </div>
    </label>
  )
})

export default function NestingReport({ filename, ifcStorageKey, projectName, nestingReport: propNestingReport, onNestingReportChange, report, initialView, onSettingsClick, onModelReady, companyDetails, nestingSettings }: NestingReportProps) {
  // Use prop as source of truth, but maintain local state for updates
  const nestingReport = propNestingReport
  const [currentStep, setCurrentStep] = useState<Step>(initialView || 'select')
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set())
  const [selectedParts, setSelectedParts] = useState<Map<string, Set<string>>>(new Map())
  const [partsData, setPartsData] = useState<Map<string, any[]>>(new Map())
  const [loadingParts, setLoadingParts] = useState(false)
  const [stockConfiguration, setStockConfiguration] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set())
  const [selectedProfilesForDisplay, setSelectedProfilesForDisplay] = useState<Set<string>>(new Set())
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false)
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number}>({top: 0, left: 0, width: 0})
  const profileFilterRef = useRef<HTMLButtonElement>(null)
  const [kerfValue, setKerfValue] = useState<number>(3.0) // Default kerf: 3mm
  const [trimValue, setTrimValue] = useState<number>(5.0) // Default trim: 5mm
  const [stockToleranceEnabled, setStockToleranceEnabled] = useState<boolean>(true) // Default: enabled
  const [stockToleranceValue, setStockToleranceValue] = useState<number>(10.0) // Default: 10mm
  const [stockLengths, setStockLengths] = useState<{id: number, value: number}[]>([
    {id: 1, value: 6000},
    {id: 2, value: 12000}
  ]) // Stock bar lengths with stable IDs
  const [nextStockId, setNextStockId] = useState<number>(3) // Counter for next stock ID
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false) // Settings modal visibility
  const [showBOMModal, setShowBOMModal] = useState<boolean>(false) // BOM export modal visibility
  const [showCuttingPlanModal, setShowCuttingPlanModal] = useState<boolean>(false) // Cutting Plan export modal visibility
  const [showConfirmNestingModal, setShowConfirmNestingModal] = useState<boolean>(false) // Confirm nesting modal visibility
  const [nestingApproved, setNestingApproved] = useState<boolean>(false) // User approval checkbox
  const [activeReportTab, setActiveReportTab] = useState<'materials' | 'bom' | 'cutting' | 'model'>('materials') // Active tab in report view
  const [modelViewSelectedProfiles, setModelViewSelectedProfiles] = useState<Set<string>>(new Set()) // Selected profiles for model view tab
  const [animatedTabs, setAnimatedTabs] = useState<Set<string>>(new Set()) // Track which tabs have been animated
  const [bomProjectName, setBomProjectName] = useState<string>('')
  
  // Initialize project name when modal opens
  useEffect(() => {
    if (showBOMModal && !bomProjectName) {
      setBomProjectName(filename.replace('.ifc', ''))
    }
  }, [showBOMModal, filename])
  const [bomSelectedProfiles, setBomSelectedProfiles] = useState<Set<string>>(new Set())
  const [cuttingPlanProjectName, setCuttingPlanProjectName] = useState<string>('')
  
  // Initialize cutting plan project name when modal opens
  useEffect(() => {
    if (showCuttingPlanModal && !cuttingPlanProjectName) {
      setCuttingPlanProjectName(filename.replace('.ifc', ''))
    }
  }, [showCuttingPlanModal, filename])
  const [cuttingPlanSelectedProfiles, setCuttingPlanSelectedProfiles] = useState<Set<string>>(new Set())
  const [exportProgress, setExportProgress] = useState<{show: boolean, current: number, total: number}>({show: false, current: 0, total: 0})
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  
  // Chart filter states
  const [chartFilterProfile, setChartFilterProfile] = useState<string>('all')
  const [chartFilterStockLength, setChartFilterStockLength] = useState<string>('all')

  // Tooltip state for stockbar parts
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    profileName: string
    partName: string
    length: number
    startAngle: string
    endAngle: string
  } | null>(null)

  // Get available profiles from report and sort by tonnage (highest first)
  const availableProfiles = (report?.profiles || []).sort((a, b) => b.total_weight - a.total_weight)
  
  // Initialize all profiles as selected when nesting report is loaded
  useEffect(() => {
    if (nestingReport?.profiles) {
      setSelectedProfilesForDisplay(new Set(nestingReport.profiles.map(p => p.profile_name)))
    }
  }, [nestingReport])

  // Expose settings handler to parent
  const handleOpenSettings = useCallback(() => {
    setShowSettingsModal(true)
  }, [])

  useEffect(() => {
    if (onSettingsClick) {
      onSettingsClick(handleOpenSettings)
    }
  }, [onSettingsClick, handleOpenSettings])
  
  // Mark current tab as animated after animation completes
  useEffect(() => {
    if (currentStep === 'results' && nestingReport && !animatedTabs.has(activeReportTab)) {
      const timer = setTimeout(() => {
        setAnimatedTabs(prev => new Set([...prev, activeReportTab]))
      }, 1600) // Slightly longer than animation duration
      return () => clearTimeout(timer)
    }
  }, [currentStep, nestingReport, activeReportTab, animatedTabs])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isProfileDropdownOpen) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('profile-dropdown')
      const trigger = document.getElementById('profile-filter')
      if (dropdown && !dropdown.contains(event.target as Node) && !trigger?.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileDropdownOpen])
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('cutwise_nesting_settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        if (settings.kerf !== undefined) setKerfValue(settings.kerf)
        if (settings.trim !== undefined) setTrimValue(settings.trim)
        if (settings.toleranceEnabled !== undefined) setStockToleranceEnabled(settings.toleranceEnabled)
        if (settings.tolerance !== undefined) setStockToleranceValue(settings.tolerance)
        if (settings.stockLengths && Array.isArray(settings.stockLengths)) {
          // Convert old format (number[]) to new format ({id, value}[])
          if (typeof settings.stockLengths[0] === 'number') {
            setStockLengths(settings.stockLengths.map((val: number, idx: number) => ({id: idx + 1, value: val})))
            setNextStockId(settings.stockLengths.length + 1)
          } else {
            setStockLengths(settings.stockLengths)
            const maxId = Math.max(...settings.stockLengths.map((s: any) => s.id))
            setNextStockId(maxId + 1)
          }
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }, [])
  
  // Track window width for responsive display with throttling
  useEffect(() => {
    let timeoutId: number
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        setWindowWidth(window.innerWidth)
      }, 150) // Throttle to 150ms
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  // Save settings to localStorage
  const saveSettings = () => {
    const settings = {
      kerf: kerfValue,
      trim: trimValue,
      toleranceEnabled: stockToleranceEnabled,
      tolerance: stockToleranceValue,
      stockLengths: stockLengths
    }
    localStorage.setItem('cutwise_nesting_settings', JSON.stringify(settings))
    setShowSettingsModal(false)
  }
  
  const getDisplayPartName = (part: any): string => {
    const partData = part?.part || {}
    const reference = typeof partData.reference === 'string' && partData.reference.trim() ? partData.reference : null
    const elementName = typeof partData.element_name === 'string' && partData.element_name.trim() ? partData.element_name : null
    return reference || elementName || 'Unknown'
  }

  // Global canonical geometry map - established once across ALL profiles and patterns
  // This ensures parts with the same name have identical geometry everywhere
  const [globalCanonicalMap, setGlobalCanonicalMap] = useState<Map<string, { startDev: number; endDev: number; startSign: number; endSign: number } | null>>(new Map())

  // Build global canonical map whenever nesting report changes
  useEffect(() => {
    if (!nestingReport) {
      setGlobalCanonicalMap(new Map())
      return
    }

    const canonicalMap = new Map<string, { startDev: number; endDev: number; startSign: number; endSign: number } | null>()

    // Process ALL profiles and patterns to find first occurrence of each part
    nestingReport.profiles.forEach((profile) => {
      profile.cutting_patterns.forEach((pattern) => {
        pattern.parts.forEach((part) => {
          const partName = getDisplayPartName(part)
          
          // Only process if not already in map (first occurrence wins)
          if (!canonicalMap.has(partName)) {
            // Check both slope_info and part.part for angle data
            const slopeInfo = part?.slope_info || {}
            const partData = part?.part || {}
            
            const startMiter = slopeInfo.start_has_slope === true
            const endMiter = slopeInfo.end_has_slope === true

            // Debug: log the part data structure for b1024
            if (partName === 'b1024') {
              console.log(`[GLOBAL-CANONICAL-DEBUG] ${partName} part.part:`, partData)
              console.log(`[GLOBAL-CANONICAL-DEBUG] ${partName} slope_info:`, slopeInfo)
            }

            // Only store canonical geometry for parts with two mitered ends
            if (startMiter && endMiter) {
              // Try to use angles from part.part (original part definition) first
              let startAngle = partData.start_angle
              let endAngle = partData.end_angle
              
              // Fallback to slope_info if not in part.part
              if (startAngle == null) startAngle = slopeInfo.start_angle
              if (endAngle == null) endAngle = slopeInfo.end_angle

              if (startAngle != null && endAngle != null) {
                // Calculate deviation from 90 degrees
                const startDev = Math.abs(90 - Math.abs(startAngle))
                const endDev = Math.abs(90 - Math.abs(endAngle))
                const startSign = startAngle >= 0 ? 1 : -1
                const endSign = endAngle >= 0 ? 1 : -1

                canonicalMap.set(partName, {
                  startDev,
                  endDev,
                  startSign,
                  endSign
                })
                console.log(`[GLOBAL-CANONICAL] Setting canonical for ${partName}:`, { startDev, endDev, startSign, endSign, rawAngles: { startAngle, endAngle }, source: partData.start_angle != null ? 'part.part' : 'slope_info' })
              } else {
                canonicalMap.set(partName, null)
              }
            } else {
              // Mark as seen but no canonical geometry needed
              canonicalMap.set(partName, null)
            }
          }
        })
      })
    })

    console.log('[GLOBAL-CANONICAL] Built canonical map with', canonicalMap.size, 'entries')
    setGlobalCanonicalMap(canonicalMap)
  }, [nestingReport])

  // Don't load nesting data from localStorage - always start fresh
  // This ensures clean state when uploading new file or refreshing page

  const handleProfileToggle = useCallback((profileName: string) => {
    setSelectedProfiles(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(profileName)) {
        newSelected.delete(profileName)
      } else {
        newSelected.add(profileName)
      }
      return newSelected
    })
  }, [])

  const handleSelectAll = () => {
    if (selectedProfiles.size === availableProfiles.length) {
      setSelectedProfiles(new Set())
    } else {
      setSelectedProfiles(new Set(availableProfiles.map(p => p.profile_name)))
    }
  }

  const fetchPartsForProfiles = async () => {
    setLoadingParts(true)
    try {
      console.log('[PARTS] Fetching parts for profiles:', Array.from(selectedProfiles))
      const response = await apiRequest(`/api/parts/${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_names: Array.from(selectedProfiles)
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch parts: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('[PARTS] Parsed data:', data)
      
      const partsMap = new Map<string, any[]>()
      Object.entries(data.parts_by_profile || {}).forEach(([profileName, parts]: [string, any]) => {
        console.log(`[PARTS] Profile ${profileName}:`, parts)
        partsMap.set(profileName, parts)
      })
      
      console.log('[PARTS] Parts map size:', partsMap.size)
      setPartsData(partsMap)
      setCurrentStep('part-selection')
    } catch (error) {
      console.error('Error fetching parts:', error)
      alert('Failed to load parts data. Please try again.')
    } finally {
      setLoadingParts(false)
    }
  }

  const handleNext = () => {
    if (selectedProfiles.size === 0) {
      setError('Please select at least one profile to nest')
      return
    }
    setError(null)
    generateNesting()
  }


  const handleExportToPDF = async () => {
    if (!nestingReport || !report) return

    try {
      // Use html2pdf to capture the exact screen rendering
      const html2pdf = (await import('html2pdf.js')).default
      
      const element = document.getElementById('nesting-report-pdf-content')
      if (!element) {
        alert('Report content not found. Please try again.')
        return
      }
      
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${filename.replace('.ifc', '')}_nesting_report.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1440
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape' as const
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }
      
      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const handleExportBOMToPDF = async () => {
    if (!nestingReport || !report || bomSelectedProfiles.size === 0) {
      alert('Please select at least one profile to export.')
      return
    }

    const startTime = Date.now()

    // Close modal immediately so Lottie loader is visible
    setShowBOMModal(false)

    try {
      // Show Lottie loader with progress
      setLoadingMessage('Generating Bill of materials document')
      setExportProgress({ show: true, current: 10, total: 100 })
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Filter nesting report to only include selected profiles
      const filteredNestingReport = {
        ...nestingReport,
        profiles: nestingReport.profiles.filter(p => bomSelectedProfiles.has(p.profile_name))
      }
      
      setExportProgress({ show: true, current: 20, total: 100 })
      
      // Use company details from props (from Supabase) or fallback to localStorage
      const finalCompanyDetails = companyDetails || ProjectStorage.getCompanyDetails() || {
        companyName: 'Your Company Name',
        address: 'Company Address',
        country: '',
        phoneNumber: 'Company Phone Number',
        email: ''
      }
      
      console.log('[BOM Export] Company details:', finalCompanyDetails)
      
      setExportProgress({ show: true, current: 40, total: 100 })
      
      // Load icons as base64
      const iconPaths = {
        check: '/Icons/check-circle.svg',
        company: '/Icons/building-one.svg',
        address: '/Icons/location.svg',
        email: '/Icons/envelope-open.svg',
        phone: '/Icons/telephone.svg',
        date: '/Icons/calendar.svg',
        project: '/Icons/ar.svg',
        logo: '/Icons/Cutwise for pdf main.svg'
      }
      
      const icons: Record<string, string> = {}
      for (const [key, path] of Object.entries(iconPaths)) {
        icons[key] = await loadIconAsBase64(path)
      }
      
      setExportProgress({ show: true, current: 60, total: 100 })
      
      // Call backend to generate PDF
      const response = await fetch(`${getBackendUrl()}/api/generate-bom-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nestingReport: filteredNestingReport,
          report: report,
          projectName: bomProjectName || projectName || filename.replace('.ifc', ''),
          companyDetails: {
            companyName: finalCompanyDetails.companyName,
            address: finalCompanyDetails.address,
            email: finalCompanyDetails.email,
            phoneNumber: finalCompanyDetails.phoneNumber
          },
          icons: icons
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }
      
      setExportProgress({ show: true, current: 80, total: 100 })
      
      // Download the PDF
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const downloadName = bomProjectName 
        ? `${bomProjectName}_BOM.pdf` 
        : `${filename.replace('.ifc', '')}_BOM.pdf`
      link.href = url
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setExportProgress({ show: true, current: 100, total: 100 })
      
      // Ensure minimum 3 seconds display time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      // Hide loader
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    } catch (error) {
      console.error('Error exporting BOM to PDF:', error)
      
      // Ensure minimum 3 seconds display time even on error
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      alert('Failed to export BOM PDF. Please try again.')
      
      // Hide loader
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    }
  }

  const handleExportBOMToExcel = async () => {
    if (!nestingReport || !report) {
      alert('No nesting report available to export.')
      return
    }

    const startTime = Date.now()

    try {
      // Show Lottie loader with progress
      setLoadingMessage('Generating Bill of materials Excel')
      setExportProgress({ show: true, current: 20, total: 100 })
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setExportProgress({ show: true, current: 40, total: 100 })
      
      // Use company details from props (from Supabase) or fallback to localStorage
      const finalCompanyDetails = companyDetails || ProjectStorage.getCompanyDetails() || {
        companyName: 'Your Company Name',
        address: 'Company Address',
        country: '',
        phoneNumber: 'Company Phone Number',
        email: ''
      }
      
      setExportProgress({ show: true, current: 60, total: 100 })
      
      // Call backend to generate Excel (export all profiles)
      const response = await fetch(`${getBackendUrl()}/api/generate-bom-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nestingReport: nestingReport,
          report: report,
          projectName: projectName || filename.replace('.ifc', ''),
          companyDetails: {
            companyName: finalCompanyDetails.companyName,
            address: finalCompanyDetails.address,
            email: finalCompanyDetails.email,
            phoneNumber: finalCompanyDetails.phoneNumber
          }
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }
      
      setExportProgress({ show: true, current: 85, total: 100 })
      
      // Download the Excel
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const downloadName = `${filename.replace('.ifc', '')}_BOM.xlsx`
      link.href = url
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setExportProgress({ show: true, current: 100, total: 100 })
      
      // Ensure minimum 3 seconds display time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      // Hide loader
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    } catch (error) {
      console.error('Error exporting BOM to Excel:', error)
      
      // Ensure minimum 3 seconds display time even on error
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      alert('Failed to export BOM Excel. Please try again.')
      
      // Hide loader
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    }
  }

  // Old client-side capture function - no longer used with server-side generation
  // Kept for reference/fallback if needed
  // const captureStockbarImage = async (...) => { ... }

  const handleExportCuttingListToExcel = async () => {
    if (!nestingReport || !report || selectedProfilesForDisplay.size === 0) {
      alert('Please select at least one profile to export.')
      return
    }

    const startTime = Date.now()

    try {
      // Show Lottie loader with progress
      setLoadingMessage('Generating Cutting List Excel')
      setExportProgress({ show: true, current: 20, total: 100 })
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setExportProgress({ show: true, current: 40, total: 100 })
      
      // Use company details from props (from Supabase) or fallback to localStorage
      const finalCompanyDetails = companyDetails || ProjectStorage.getCompanyDetails() || {
        companyName: 'Your Company Name',
        address: 'Company Address',
        country: '',
        phoneNumber: 'Company Phone Number',
        email: ''
      }
      
      setExportProgress({ show: true, current: 60, total: 100 })
      
      // Filter nesting report to only include selected profiles with cutting patterns
      const filteredNestingReport = {
        ...nestingReport,
        profiles: nestingReport.profiles.filter(p => 
          selectedProfilesForDisplay.has(p.profile_name) && 
          p.cutting_patterns.length > 0
        )
      }
      
      // Call backend to generate Excel
      const response = await fetch(`${getBackendUrl()}/api/generate-cutting-list-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nestingReport: filteredNestingReport,
          report: report,
          projectName: projectName || filename.replace('.ifc', ''),
          companyDetails: {
            companyName: finalCompanyDetails.companyName,
            address: finalCompanyDetails.address,
            email: finalCompanyDetails.email,
            phoneNumber: finalCompanyDetails.phoneNumber
          },
          selectedProfiles: Array.from(selectedProfilesForDisplay)
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }
      
      setExportProgress({ show: true, current: 85, total: 100 })
      
      // Download the Excel
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const downloadName = `${filename.replace('.ifc', '')}_Cutting_List.xlsx`
      link.href = url
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setExportProgress({ show: true, current: 100, total: 100 })
      
      // Ensure minimum 3 seconds display time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      // Hide loader
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    } catch (error) {
      console.error('Error exporting Cutting List to Excel:', error)
      
      // Ensure minimum 3 seconds display time even on error
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      alert('Failed to export Excel. Please try again.')
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    }
  }

  const loadIconAsBase64 = async (iconPath: string): Promise<string> => {
    try {
      const response = await fetch(iconPath)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          // Remove data URL prefix to get just the base64 content
          const base64Content = base64.split(',')[1] || base64
          resolve(base64Content)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error(`Failed to load icon: ${iconPath}`, error)
      return ''
    }
  }

  const handleExportCuttingPlanToPDF = async () => {
    if (!nestingReport || !report || cuttingPlanSelectedProfiles.size === 0) {
      alert('Please select at least one profile to export.')
      return
    }

    const originalExpandedProfiles = new Set(expandedProfiles)
    const startTime = Date.now()

    // Close modal immediately so Lottie loader is visible
    setShowCuttingPlanModal(false)

    try {
      // Show Lottie loader with progress
      setLoadingMessage('Generating optimized cutting plan')
      setExportProgress({ show: true, current: 10, total: 100 })
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Filter nesting report to only include selected profiles
      const filteredNestingReport = {
        ...nestingReport,
        profiles: nestingReport.profiles.filter(p => cuttingPlanSelectedProfiles.has(p.profile_name))
      }
      
      // Temporarily expand all selected profiles so SVGs are rendered
      const newExpanded = new Set(expandedProfiles)
      cuttingPlanSelectedProfiles.forEach(profileName => {
        newExpanded.add(profileName)
      })
      setExpandedProfiles(newExpanded)
      
      setExportProgress({ show: true, current: 20, total: 100 })
      
      // Wait for fonts to load and React to render
      await document.fonts.ready
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setExportProgress({ show: true, current: 40, total: 100 })
      
      // Extract SVG polygon data from DOM
      const stockbarSvgData: Array<{
        profileName: string
        patternIdx: number
        svgData: {
          viewBox: string
          parts: Array<{
            points: string
            fill: string
            partName: string
          }>
        }
      }> = []
      
      for (let profileIdx = 0; profileIdx < nestingReport.profiles.length; profileIdx++) {
        const profile = nestingReport.profiles[profileIdx]
        if (!cuttingPlanSelectedProfiles.has(profile.profile_name)) continue
        
        console.log(`[SVG-EXPORT] Processing profile: ${profile.profile_name} (index ${profileIdx}), ${profile.cutting_patterns.length} patterns`)
        
        for (let patternIdx = 0; patternIdx < profile.cutting_patterns.length; patternIdx++) {
          const svgElement = document.getElementById(`stockbar-svg-${profileIdx}-${patternIdx}`)
          const containerElement = document.getElementById(`stockbar-container-${profileIdx}-${patternIdx}`)
          
          if (svgElement && containerElement) {
            const viewBox = svgElement.getAttribute('viewBox') || '0 0 1000 60'
            const polygons = svgElement.querySelectorAll('polygon')
            
            console.log(`[SVG-EXPORT] Found SVG for ${profile.profile_name} pattern ${patternIdx}: ${polygons.length} polygons`)
            
            // Create mapping from part name to table number (same logic as rendering)
            const partNameToNumber = new Map<string, number>()
            try {
              const partGroups = new Map<string, { name: string, length: number, count: number }>()
              
              profile.cutting_patterns[patternIdx].parts.forEach((part) => {
                const partName = getDisplayPartName(part)
                const partLength = part?.length || 0
                
                if (partGroups.has(partName)) {
                  const existing = partGroups.get(partName)!
                  existing.count += 1
                } else {
                  partGroups.set(partName, { name: partName, length: partLength, count: 1 })
                }
              })
              
              const sortedGroups = Array.from(partGroups.values()).sort((a, b) => b.length - a.length)
              sortedGroups.forEach((group, idx) => {
                partNameToNumber.set(group.name, idx + 1)
              })
            } catch (e) {
              console.error('[PDF-EXPORT] Failed to create part mapping:', e)
            }
            
            const parts: Array<{points: string, fill: string, partName: string}> = []
            
            // Extract only the polygons that actually exist in the SVG
            // The number of polygons may not match the number of parts in the data
            // This can happen when multiple parts are grouped together or parts aren't rendered
            const numPolygons = polygons.length
            const numParts = profile.cutting_patterns[patternIdx].parts.length
            
            console.log(`[SVG-EXPORT] Pattern has ${numParts} parts in data, ${numPolygons} polygons in SVG`)
            
            // Extract each polygon and try to match it with a part
            for (let polyIdx = 0; polyIdx < numPolygons; polyIdx++) {
              const polygon = polygons[polyIdx]
              const points = polygon.getAttribute('points') || ''
              const fill = polygon.getAttribute('fill') || '#ccc'
              
              if (!points) {
                console.warn(`[SVG-EXPORT] No points data for polygon ${polyIdx}`)
                continue
              }
              
              // Try to get the corresponding part (if it exists at this index)
              const part = profile.cutting_patterns[patternIdx].parts[polyIdx]
              if (part) {
                const partName = getDisplayPartName(part)
                const partNumber = partNameToNumber.get(partName)
                const displayLabel = partNumber ? String(partNumber) : partName
                
                // Polygons are already in viewBox coordinate system (0 0 1000 60)
                // No scaling needed - pass them directly to PDF
                parts.push({ points, fill, partName: displayLabel })
              } else {
                // Polygon exists but no corresponding part data - use a generic label
                parts.push({ points, fill, partName: String(polyIdx + 1) })
              }
            }
            
            console.log(`[SVG-EXPORT] Extracted ${parts.length} parts for ${profile.profile_name} pattern ${patternIdx}`)
            
            // Store by profile name instead of index so backend can match correctly
            stockbarSvgData.push({
              profileName: profile.profile_name,
              patternIdx,
              svgData: { viewBox, parts }
            })
          } else {
            console.warn(`[SVG-EXPORT] SVG element not found for profile ${profileIdx} pattern ${patternIdx}`)
          }
        }
      }
      
      // Load all icons as base64
      const icons = {
        logo_main: await loadIconAsBase64('/Icons/Cutwise for pdf main.svg'),
        logo_small: await loadIconAsBase64('/Icons/Cutwise for pdf main.svg'),
        // Cover page icons (pdf- prefix)
        pdf_project_name: await loadIconAsBase64('/Icons/pdf-ProjectName.svg'),
        pdf_date: await loadIconAsBase64('/Icons/pdf-Date.svg'),
        pdf_weight: await loadIconAsBase64('/Icons/pdf-Weight.svg'),
        pdf_profile_type: await loadIconAsBase64('/Icons/pdf-Profiletype.svg'),
        pdf_cutting_qty: await loadIconAsBase64('/Icons/pdf-Cuttinqty.svg'),
        // Settings icons for cover page
        tolerance: await loadIconAsBase64('/Icons/ToleranceForCard.svg'),
        trim: await loadIconAsBase64('/Icons/TrimForCard.svg'),
        kerf: await loadIconAsBase64('/Icons/KerfforCard.svg'),
        // Section icons
        length: await loadIconAsBase64('/Icons/length for section.svg'),
        tolerance_section: await loadIconAsBase64('/Icons/tolerance for section.svg'),
        trim_section: await loadIconAsBase64('/Icons/trim for section.svg'),
        kerf_section: await loadIconAsBase64('/Icons/kerf for section.svg'),
        waste: await loadIconAsBase64('/Icons/Waste icon.svg'),
      }
      
      // Use company details from props (from Supabase) or fallback to localStorage
      const finalCompanyDetails = companyDetails || ProjectStorage.getCompanyDetails() || {}
      
      setExportProgress({ show: true, current: 70, total: 100 })
      
      // Calculate total weight from original report data
      const totalWeight = nestingReport && report ?
        nestingReport.profiles
          .filter(profile => cuttingPlanSelectedProfiles.has(profile.profile_name))
          .reduce((sum, profile) => {
            const profileData = report.profiles.find(p => p.profile_name === profile.profile_name)
            return sum + (profileData ? profileData.total_weight / 1000 : 0)
          }, 0) : 0
      
      console.log('[Cutting Plan Export] Company details:', finalCompanyDetails)
      
      // Call backend API with extracted SVG data
      const response = await fetch(`${getBackendUrl()}/api/generate-cutting-plan-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nestingReport: filteredNestingReport,
          projectName: cuttingPlanProjectName || projectName || filename.replace('.ifc', ''),
          tolerance: nestingReport.settings?.stock_tolerance ?? 0,
          toleranceEnabled: (nestingReport.settings?.stock_tolerance ?? 0) > 0,
          trim: nestingReport.settings?.trim ?? 5.0,
          kerf: nestingReport.settings?.kerf ?? 3.0,
          selectedProfiles: Array.from(cuttingPlanSelectedProfiles),
          stockbarSvgData: stockbarSvgData,
          totalWeight: totalWeight,
          companyDetails: finalCompanyDetails,
          icons: icons
        })
      })
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`)
      }
      
      setExportProgress({ show: true, current: 85, total: 100 })
      
      // Get PDF blob
      const blob = await response.blob()
      
      setExportProgress({ show: true, current: 95, total: 100 })
      
      // Trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const downloadName = cuttingPlanProjectName 
        ? `${cuttingPlanProjectName}_Cutting_Plan.pdf` 
        : `${filename.replace('.ifc', '')}_Cutting_Plan.pdf`
      link.href = url
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setExportProgress({ show: true, current: 100, total: 100 })
      
      // Ensure minimum 3 seconds display time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      // Restore original expanded state
      setExpandedProfiles(originalExpandedProfiles)
      
      // Hide loader
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    } catch (error) {
      console.error('Error exporting Cutting Plan to PDF:', error)
      
      // Ensure minimum 3 seconds display time even on error
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
      
      alert('Failed to export Cutting Plan PDF. Please try again.')
      
      // Restore original expanded state
      setExpandedProfiles(originalExpandedProfiles)
      
      // Hide loader
      setExportProgress({ show: false, current: 0, total: 0 })
      setLoadingMessage('')
    }
  }

  const generateNesting = async () => {
    console.log('[GENERATE-NESTING] Function called!')
    console.log('[GENERATE-NESTING] filename:', filename)
    console.log('[GENERATE-NESTING] selectedProfiles:', selectedProfiles)
    
    if (!filename || selectedProfiles.size === 0) {
      console.log('[GENERATE-NESTING] Early return - missing filename or profiles')
      return
    }

    const startTime = Date.now()
    setLoading(true)
    setLoadingProgress(0)
    setLoadingMessage('Generating optimized materials plan')
    setError(null)

    try {
      const encodedFilename = encodeURIComponent(filename)
      console.log('[GENERATE-NESTING] Encoded filename:', encodedFilename)
      
      // Convert selectedParts Map to plain object
      const selectedPartsObj: Record<string, string[]> = {}
      selectedParts.forEach((parts, profile) => {
        selectedPartsObj[profile] = Array.from(parts)
      })
      
      // Convert stock configuration to backend format
      const stockConfigObj: Record<string, { purchased: number[], leftovers: { length: number, quantity: number }[] }> = {}
      stockConfiguration.forEach((config: any) => {
        stockConfigObj[config.profileName] = {
          purchased: config.purchasedStocks.map((s: any) => s.length),
          leftovers: config.leftoverStocks.map((s: any) => ({ length: s.length, quantity: s.quantity || 1 }))
        }
      })
      
      console.log('Selected parts:', selectedPartsObj)
      console.log('Stock configuration:', stockConfigObj)
      console.log('Stock config array length:', stockConfiguration.length)
      
      const url = `/api/nesting/${encodedFilename}`
      
      // Simulate progress while waiting for response
      setLoadingProgress(10)
      await new Promise(resolve => setTimeout(resolve, 100))
      setLoadingProgress(20)
      
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 90) {
            return prev + 5
          }
          return prev
        })
      }, 500)

      console.log('[GENERATE-NESTING] Making POST request to:', url)
      console.log('[GENERATE-NESTING] Request body:', {
        profiles: Array.from(selectedProfiles),
        selected_parts: selectedPartsObj,
        stock_config: stockConfigObj,
        kerf: kerfValue,
        trim: trimValue,
        stock_tolerance: stockToleranceEnabled ? stockToleranceValue : 0
      })
      
      const response = await apiRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profiles: Array.from(selectedProfiles),
          selected_parts: selectedPartsObj,
          stock_config: stockConfigObj,
          kerf: kerfValue,
          trim: trimValue,
          stock_tolerance: stockToleranceEnabled ? stockToleranceValue : 0
        })
      })
      clearInterval(progressInterval)
      
      console.log('[GENERATE-NESTING] Response received:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Backend error response:', errorText)
        throw new Error(`Failed to generate nesting: ${response.status} ${response.statusText}\n\n${errorText}`)
      }

      setLoadingProgress(95)
      const data: NestingReportType = await response.json()
      
      console.log('[GENERATE-NESTING] Parsed response data:', data)
      console.log('[GENERATE-NESTING] Profiles in response:', data.profiles?.length || 0)
      
      setLoadingProgress(100)
      onNestingReportChange(data)
      setCurrentStep('results')
      setAnimatedTabs(new Set()) // Reset animation flags for new nesting results
      
      // Ensure minimum 3 seconds display time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
    } catch (err) {
      console.error('[GENERATE-NESTING] ERROR:', err)
      console.error('[GENERATE-NESTING] Error details:', err instanceof Error ? err.message : 'Unknown error')
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error generating nesting:', err)
      
      // Ensure minimum 3 seconds display time even on error
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsedTime)
      await new Promise(resolve => setTimeout(resolve, remainingTime))
    } finally {
      setLoading(false)
      setLoadingMessage('')
      setLoadingProgress(0)
    }
  }

  const formatLength = (mm: number) => {
    if (mm >= 1000) {
      return `${(mm / 1000).toFixed(2)}m`
    }
    return `${mm.toFixed(0)}mm`
  }


  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 mx-4 mt-4 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Step 1: Profile Selection with Split Screen */}
        <div className={`flex-1 flex flex-col overflow-hidden bg-gray-50 ${currentStep !== 'select' ? 'hidden' : ''}`}>
          {/* Main Content */}
          <div className="flex-1 flex justify-center overflow-hidden">
            <div className="w-full max-w-[1200px] flex overflow-hidden h-full">
              {/* Left Panel - Profile List (max 30% width) */}
              <div className="w-full max-w-[30%] border-r flex flex-col">
                {/* Header */}
                <div className="p-4 border-b">
                  {/* Metric Cards */}
                  <div className="grid grid-cols-3 divide-x divide-gray-200 mb-4">
                    {/* Profile Types Card */}
                    <div className="flex flex-col items-center justify-center text-center py-4">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#00817A15' }}>
                        <img src="/Icons/Profile qty.svg" alt="Profile Types" className="h-6 w-6" style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(46%) saturate(1234%) hue-rotate(141deg) brightness(94%) contrast(101%)' }} />
                      </div>
                      <p className="text-2xl font-bold text-primary mb-1">{selectedProfiles.size}</p>
                      <p className="text-xs text-muted-foreground leading-tight">Profile Types</p>
                    </div>

                    {/* Weight Card */}
                    <div className="flex flex-col items-center justify-center text-center py-4">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#00817A15' }}>
                        <img src="/Icons/pdf-Weight.svg" alt="Weight" className="h-6 w-6" style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(46%) saturate(1234%) hue-rotate(141deg) brightness(94%) contrast(101%)' }} />
                      </div>
                      <p className="text-2xl font-bold text-primary mb-1">
                        {(availableProfiles
                          .filter(p => selectedProfiles.has(p.profile_name))
                          .reduce((sum, p) => sum + p.total_weight, 0) / 1000).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">Weight (t)</p>
                    </div>

                    {/* Cuts Quantity Card */}
                    <div className="flex flex-col items-center justify-center text-center py-4">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#00817A15' }}>
                        <img src="/Icons/pdf-Cuttinqty.svg" alt="Cuts" className="h-6 w-6" style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(46%) saturate(1234%) hue-rotate(141deg) brightness(94%) contrast(101%)' }} />
                      </div>
                      <p className="text-2xl font-bold text-primary mb-1">
                        {availableProfiles
                          .filter(p => selectedProfiles.has(p.profile_name))
                          .reduce((sum, p) => sum + p.piece_count, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">Cuts Quantity</p>
                    </div>
                  </div>

                  {/* Select All Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSelectAll}
                  >
                    {selectedProfiles.size === availableProfiles.length ? 'Deselect All' : 'Select All'}
                  </Button>

                  {/* Summary info */}
                  <div className="text-sm text-center text-gray-500 mt-3">
                    {selectedProfiles.size} of {availableProfiles.length} profiles selected
                  </div>
                </div>

                {/* Profile List */}
                <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: '80px' }}>
                  {availableProfiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-sm">No profiles found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableProfiles.map((profile, idx) => (
                        <ProfileItem
                          key={profile.profile_name}
                          profile={profile}
                          isSelected={selectedProfiles.has(profile.profile_name)}
                          onToggle={handleProfileToggle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - IFC Viewer (70% width) */}
              <div className="flex-1" style={{ willChange: 'transform', contain: 'layout style paint', paddingBottom: '80px' }}>
                <IFCViewerWebIFC
                  filename={filename}
                  ifcStorageKey={ifcStorageKey}
                  isVisible={currentStep === 'select'}
                  selectedProfiles={selectedProfiles}
                  onModelReady={onModelReady}
                />
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <NestingBottomNav
            currentStep={1}
            showBack={false}
            onContinue={fetchPartsForProfiles}
            continueDisabled={selectedProfiles.size === 0 || loading || loadingParts}
            continueText={loadingParts ? 'Loading Parts...' : 'Continue'}
          />
        </div>

        {/* Step 2: Part Selection */}
        {currentStep === 'part-selection' && (
          <PartSelection
            profilesData={Array.from(selectedProfiles).map(profileName => {
              const parts = partsData.get(profileName) || []
              
              // Group parts by product_id and count quantities
              const partsMap = new Map<string, any>()
              
              parts.forEach(part => {
                // Use part_number as the identifier
                const partNumber = part.part_number || part.product_id?.toString() || 'Unknown'
                // Use element_name as the display name (e.g., "STRINGER", "BEAM")
                const partName = part.element_name || 'Unnamed'
                
                if (!partsMap.has(partNumber)) {
                  partsMap.set(partNumber, {
                    partNumber,
                    partName,
                    length: part.length || 0,
                    quantity: 1,
                    weight: part.weight || 0
                  })
                } else {
                  // Increment quantity if part already exists
                  const existing = partsMap.get(partNumber)!
                  existing.quantity += 1
                }
              })

              return {
                profileName,
                parts: Array.from(partsMap.values())
              }
            })}
            filename={filename}
            projectName={projectName}
            companyDetails={companyDetails}
            onBack={() => setCurrentStep('select')}
            onContinue={(selectedPartsMap) => {
              setSelectedParts(selectedPartsMap)
              setCurrentStep('stock-assignment')
            }}
          />
        )}

        {/* Step 3: Stock Assignment */}
        {currentStep === 'stock-assignment' && (
          <StockAssignment
            profiles={Array.from(selectedProfiles).map(profileName => {
              const parts = partsData.get(profileName) || []
              const profileSelectedParts = selectedParts.get(profileName) || new Set()
              
              let partCount = 0
              let totalLength = 0
              let totalWeight = 0
              let maxPartLength = 0
              
              // Count only selected parts - use part_number to match PartSelection
              parts.forEach(part => {
                const partNumber = part.part_number || part.product_id?.toString() || 'Unknown'
                
                if (profileSelectedParts.has(partNumber)) {
                  partCount += 1
                  totalLength += part.length || 0
                  totalWeight += part.weight || 0
                  maxPartLength = Math.max(maxPartLength, part.length || 0)
                }
              })

              console.log(`[StockAssignment] Profile ${profileName}: ${partCount} parts, ${totalLength}mm total, ${totalWeight}kg total, max part: ${maxPartLength}mm`)

              return {
                name: profileName,
                partCount,
                totalLength,
                totalWeight,
                maxPartLength
              }
            })}
            defaultStockLengths={nestingSettings?.stockLengths || [
              { id: 1, value: 6000 },
              { id: 2, value: 12000 }
            ]}
            onBack={() => setCurrentStep('part-selection')}
            onContinue={(stockConfig) => {
              console.log('[STOCK-ASSIGNMENT] onContinue called')
              console.log('[STOCK-ASSIGNMENT] Stock config:', stockConfig)
              console.log('[STOCK-ASSIGNMENT] Selected parts:', selectedParts)
              setStockConfiguration(stockConfig)
              setNestingApproved(false)
              setShowConfirmNestingModal(true)
              console.log('[STOCK-ASSIGNMENT] Modal should open now')
            }}
          />
        )}

        {/* Step 3: Results */}
        {currentStep === 'results' && !nestingReport && !loading && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg mb-2">No nesting data generated yet</p>
            <p className="text-sm">Go back to Step 1 to select profiles and generate nesting</p>
          </div>
        )}

        {currentStep === 'results' && nestingReport && (
          <div className={`flex-1 flex flex-col ${activeReportTab === 'model' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {/* Dark Header Section with Tab Buttons */}
            <div className="bg-[#11181C] pb-6">
              <div className="max-w-[1200px] mx-auto px-6 pt-8">
                <div className="flex items-center justify-center">
                  {/* Tab Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveReportTab('materials')}
                      className={`h-[56px] rounded-full flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus-visible:outline-none active:outline-none ${
                        activeReportTab === 'materials'
                          ? 'bg-[#008A67] border-[2.5px] border-transparent text-white pl-[6px] pr-5'
                          : 'bg-transparent border-[2.5px] border-white/20 text-white hover:border-white/30 active:border-white/20 pl-[6px] pr-5'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className={`flex items-center justify-center flex-shrink-0 w-[44px] h-[44px] rounded-full ${
                        activeReportTab === 'materials' 
                          ? 'bg-white' 
                          : 'bg-white/0 border-[2.5px] border-white/10'
                      }`}>
                        <img 
                          src="/Icons/materials analys logo.svg" 
                          alt="Materials" 
                          className={`w-[27px] h-[27px] ${activeReportTab !== 'materials' ? 'brightness-0 invert' : ''}`}
                        />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">Materials Analysis</span>
                    </button>
                    <button
                      onClick={() => setActiveReportTab('bom')}
                      className={`h-[56px] rounded-full flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus-visible:outline-none active:outline-none ${
                        activeReportTab === 'bom'
                          ? 'bg-[#008A67] border-[2.5px] border-transparent text-white pl-[6px] pr-5'
                          : 'bg-transparent border-[2.5px] border-white/20 text-white hover:border-white/30 active:border-white/20 pl-[6px] pr-5'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className={`flex items-center justify-center flex-shrink-0 w-[44px] h-[44px] rounded-full ${
                        activeReportTab === 'bom' 
                          ? 'bg-white' 
                          : 'bg-white/0 border-[2.5px] border-white/10'
                      }`}>
                        <img 
                          src="/Icons/bom icon.svg" 
                          alt="BOM" 
                          className={`w-[27px] h-[27px] ${activeReportTab !== 'bom' ? 'brightness-0 invert' : ''}`}
                        />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">Bill of Materials</span>
                    </button>
                    <button
                      onClick={() => setActiveReportTab('cutting')}
                      className={`h-[56px] rounded-full flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus-visible:outline-none active:outline-none ${
                        activeReportTab === 'cutting'
                          ? 'bg-[#008A67] border-[2.5px] border-transparent text-white pl-[6px] pr-5'
                          : 'bg-transparent border-[2.5px] border-white/20 text-white hover:border-white/30 active:border-white/20 pl-[6px] pr-5'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className={`flex items-center justify-center flex-shrink-0 w-[44px] h-[44px] rounded-full ${
                        activeReportTab === 'cutting' 
                          ? 'bg-white' 
                          : 'bg-white/0 border-[2.5px] border-white/10'
                      }`}>
                        <img 
                          src="/Icons/cutting list icon.svg" 
                          alt="Cutting" 
                          className={`w-[27px] h-[27px] ${activeReportTab !== 'cutting' ? 'brightness-0 invert' : ''}`}
                        />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">Cutting Plan</span>
                    </button>
                    <button
                      onClick={() => setActiveReportTab('model')}
                      className={`h-[56px] rounded-full flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus-visible:outline-none active:outline-none ${
                        activeReportTab === 'model'
                          ? 'bg-[#008A67] border-[2.5px] border-transparent text-white pl-[6px] pr-5'
                          : 'bg-transparent border-[2.5px] border-white/20 text-white hover:border-white/30 active:border-white/20 pl-[6px] pr-5'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className={`flex items-center justify-center flex-shrink-0 w-[44px] h-[44px] rounded-full ${
                        activeReportTab === 'model' 
                          ? 'bg-white' 
                          : 'bg-white/0 border-[2.5px] border-white/10'
                      }`}>
                        <img 
                          src="/Icons/ar.svg" 
                          alt="Model" 
                          className={`w-[27px] h-[27px] ${activeReportTab !== 'model' ? 'brightness-0 invert' : ''}`}
                        />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">Preview 3D model</span>
                    </button>
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 ${activeReportTab === 'model' ? 'bg-gray-50 overflow-hidden' : 'overflow-y-auto'}`}>
              <div className={activeReportTab === 'model' ? 'h-full' : 'max-w-[1200px] mx-auto px-6 py-6'}>
                {/* Minimum width warning */}
                {windowWidth < 900 && activeReportTab !== 'model' && (
                  <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
                    <p className="font-semibold">Screen Width Too Small</p>
                    <p className="text-sm">Minimum screen width of 900px required for optimal visualization. Current width: {windowWidth}px</p>
                  </div>
                )}

                <div id="nesting-report-pdf-content">

                  {/* Tab 1: Materials Analysis (Waste Chart) */}
                  {activeReportTab === 'materials' && (
                    <div>
                      {/* Waste Analysis Chart */}
                      {nestingReport.profiles && nestingReport.profiles.length > 0 && (() => {
              // Get unique stock lengths from all profiles
              const allStockLengths = new Set<number>()
              nestingReport.profiles.forEach(profile => {
                Object.keys(profile.stock_lengths_used).forEach(length => {
                  allStockLengths.add(Number(length))
                })
              })
              const stockLengthOptions = Array.from(allStockLengths).sort((a, b) => a - b)
              
              // Prepare chart data based on filters
              let chartData: Array<{ name: string; waste: number; stockLength?: string; isHelper?: boolean }> = []
              
              if (chartFilterProfile === 'all' && chartFilterStockLength === 'all') {
                // Show all profiles with their total waste, sorted by waste (high to low)
                chartData = nestingReport.profiles.map(profile => ({
                  name: profile.profile_name,
                  waste: Number(profile.total_waste_percentage.toFixed(2)),
                })).sort((a, b) => b.waste - a.waste)
              } else if (chartFilterProfile !== 'all' && chartFilterStockLength === 'all') {
                // Show specific profile with breakdown by stock length
                const profile = nestingReport.profiles.find(p => p.profile_name === chartFilterProfile)
                if (profile) {
                  // Group patterns by stock length and calculate average waste
                  const wasteByStock: Record<number, { total: number; count: number }> = {}
                  profile.cutting_patterns.forEach(pattern => {
                    if (!wasteByStock[pattern.stock_length]) {
                      wasteByStock[pattern.stock_length] = { total: 0, count: 0 }
                    }
                    wasteByStock[pattern.stock_length].total += pattern.waste_percentage
                    wasteByStock[pattern.stock_length].count += 1
                  })
                  
                  chartData = Object.entries(wasteByStock).map(([length, data]) => ({
                    name: `${Number(length) / 1000}m`,
                    waste: Number((data.total / data.count).toFixed(2)),
                    stockLength: length,
                  })).sort((a, b) => b.waste - a.waste)
                }
              } else if (chartFilterProfile === 'all' && chartFilterStockLength !== 'all') {
                // Show all profiles filtered by specific stock length
                chartData = nestingReport.profiles
                  .map(profile => {
                    const patternsForStock = profile.cutting_patterns.filter(
                      p => p.stock_length === Number(chartFilterStockLength)
                    )
                    if (patternsForStock.length === 0) return null
                    
                    const avgWaste = patternsForStock.reduce((sum, p) => sum + p.waste_percentage, 0) / patternsForStock.length
                    return {
                      name: profile.profile_name,
                      waste: Number(avgWaste.toFixed(2)),
                    }
                  })
                  .filter(item => item !== null)
                  .sort((a, b) => b.waste - a.waste) as Array<{ name: string; waste: number }>
              } else {
                // Show specific profile and specific stock length
                const profile = nestingReport.profiles.find(p => p.profile_name === chartFilterProfile)
                if (profile) {
                  const patternsForStock = profile.cutting_patterns.filter(
                    p => p.stock_length === Number(chartFilterStockLength)
                  )
                  if (patternsForStock.length > 0) {
                    chartData = patternsForStock
                      .map((pattern, idx) => ({
                        name: `Bar ${idx + 1}`,
                        waste: Number(pattern.waste_percentage.toFixed(2)),
                      }))
                      .sort((a, b) => b.waste - a.waste)
                  }
                }
              }
              
              // Handle single point case - add invisible helper points for line/area animation
              const originalDataLength = chartData.length
              if (chartData.length === 1) {
                const singlePoint = chartData[0]
                chartData = [
                  { name: ' ', waste: singlePoint.waste, isHelper: true },
                  singlePoint,
                  { name: '  ', waste: singlePoint.waste, isHelper: true }
                ]
              }
              
              // Calculate summary metrics based on current filters
              let avgWastePercent = 0
              let totalWasteM = 0
              let totalWasteTonnes = 0
              let totalProjectWeight = 0
              
              if (chartFilterProfile === 'all' && chartFilterStockLength === 'all') {
                // All profiles - use overall summary
                avgWastePercent = nestingReport.summary.avg_waste_percentage
                totalWasteM = nestingReport.summary.total_waste / 1000
                // Calculate total waste tonnage and total project weight from all profiles
                totalWasteTonnes = nestingReport.profiles.reduce((sum, profile) => {
                  const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                  if (profileData && profile.total_length > 0) {
                    const totalLengthM = profile.total_length / 1000
                    const weightPerMeter = profileData.total_weight / totalLengthM
                    const wasteM = profile.total_waste / 1000
                    return sum + (wasteM * weightPerMeter) / 1000
                  }
                  return sum
                }, 0)
                // Calculate total project weight (selected profiles only)
                totalProjectWeight = nestingReport.profiles.reduce((sum, profile) => {
                  const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                  if (profileData) {
                    return sum + profileData.total_weight / 1000
                  }
                  return sum
                }, 0)
              } else {
                // Calculate based on filtered data
                const relevantProfiles = chartFilterProfile === 'all' 
                  ? nestingReport.profiles 
                  : nestingReport.profiles.filter(p => p.profile_name === chartFilterProfile)
                
                relevantProfiles.forEach(profile => {
                  const patterns = chartFilterStockLength === 'all'
                    ? profile.cutting_patterns
                    : profile.cutting_patterns.filter(p => p.stock_length === Number(chartFilterStockLength))
                  
                  if (patterns.length > 0) {
                    const avgWaste = patterns.reduce((sum, p) => sum + p.waste_percentage, 0) / patterns.length
                    avgWastePercent += avgWaste
                    
                    const totalWaste = patterns.reduce((sum, p) => sum + p.waste, 0)
                    totalWasteM += totalWaste / 1000
                    
                    const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                    if (profileData && profile.total_length > 0) {
                      const totalLengthM = profile.total_length / 1000
                      const weightPerMeter = profileData.total_weight / totalLengthM
                      totalWasteTonnes += (totalWaste / 1000 * weightPerMeter) / 1000
                      // Add to total project weight
                      totalProjectWeight += profileData.total_weight / 1000
                    }
                  }
                })
                
                avgWastePercent = avgWastePercent / relevantProfiles.length
              }
              
              return (
              <div className="mb-2">
                {/* Summary Cards with Animation */}
                <AnimatedMetricCards 
                  avgWastePercent={avgWastePercent}
                  totalWasteM={totalWasteM}
                  totalWasteTonnes={totalWasteTonnes}
                  totalProjectWeight={totalProjectWeight}
                  shouldAnimate={!animatedTabs.has('materials')}
                />
                
                <Card className="border-0 shadow-none">
                  <CardContent className="pt-6 px-0 pb-2">
                    {/* Filters */}
                    <div className="flex gap-4 mb-9 px-[150px]">
                      <div className="flex-1">
                        <Label htmlFor="profile-filter" className="mb-2 block">Filter by Profile</Label>
                        <Select value={chartFilterProfile} onValueChange={setChartFilterProfile}>
                          <SelectTrigger id="profile-filter">
                            <SelectValue placeholder="All Profiles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Profiles</SelectItem>
                            {nestingReport.profiles.map(profile => (
                              <SelectItem key={profile.profile_name} value={profile.profile_name}>
                                {profile.profile_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex-1">
                        <Label htmlFor="stock-filter" className="mb-2 block">Filter by Stock Length</Label>
                        <Select value={chartFilterStockLength} onValueChange={setChartFilterStockLength}>
                          <SelectTrigger id="stock-filter">
                            <SelectValue placeholder="All Stock Lengths" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Stock Lengths</SelectItem>
                            {stockLengthOptions.map(length => (
                              <SelectItem key={length} value={length.toString()}>
                                {(length / 1000).toFixed(1)}m ({length}mm)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            setChartFilterProfile('all')
                            setChartFilterStockLength('all')
                          }}
                          disabled={chartFilterProfile === 'all' && chartFilterStockLength === 'all'}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                    
                    {/* Chart */}
                    {chartData.length > 0 ? (
                    <div style={{ width: '100%', height: 600 }} key={`${chartFilterProfile}-${chartFilterStockLength}`}>
                      <ResponsiveContainer>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 20, right: 50, left: 50, bottom: 100 }}
                        >
                          <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#00817A" />
                              <stop offset="100%" stopColor="#00FF9F" />
                            </linearGradient>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00817A" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="#00817A" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={120}
                            tick={(props: any) => {
                              const { x, y, payload } = props
                              // Hide tick for helper points
                              if (chartData[payload.index]?.isHelper) return <></>
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <text
                                    x={0}
                                    y={0}
                                    dy={16}
                                    textAnchor="end"
                                    fill="#374151"
                                    fontSize={11}
                                    fontWeight={500}
                                    transform="rotate(-45)"
                                  >
                                    {payload.value}
                                  </text>
                                </g>
                              )
                            }}
                            label={(props: any) => {
                              const { viewBox } = props
                              const labelText = chartFilterProfile !== 'all' && chartFilterStockLength === 'all' 
                                ? 'Stock Length' 
                                : chartFilterProfile !== 'all' && chartFilterStockLength !== 'all'
                                ? 'Bar Number'
                                : 'Profile Name'
                              const x = viewBox.x + viewBox.width / 2
                              const y = viewBox.y + viewBox.height + 20
                              return (
                                <g>
                                  <rect
                                    x={x - 60}
                                    y={y - 16}
                                    width={120}
                                    height={32}
                                    rx={16}
                                    fill="#FAFAFA"
                                    stroke="#F0F0F0"
                                    strokeWidth={1}
                                  />
                                  <text
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="#374151"
                                    fontSize={11}
                                    fontWeight={600}
                                  >
                                    {labelText}
                                  </text>
                                </g>
                              )
                            }}
                            padding={{ left: 30, right: 30 }}
                          />
                          
                          <YAxis
                            tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
                            label={(props: any) => {
                              const { viewBox } = props
                              const x = viewBox.x - 10
                              const y = viewBox.y + viewBox.height / 2
                              return (
                                <g transform={`translate(${x}, ${y})`}>
                                  <g transform="rotate(-90)">
                                    <rect
                                      x={-45}
                                      y={-16}
                                      width={90}
                                      height={32}
                                      rx={16}
                                      fill="#FAFAFA"
                                      stroke="#F0F0F0"
                                      strokeWidth={1}
                                    />
                                    <text
                                      x={0}
                                      y={0}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill="#374151"
                                      fontSize={11}
                                      fontWeight={600}
                                    >
                                      Waste (%)
                                    </text>
                                  </g>
                                </g>
                              )
                            }}
                          />
                          
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null
                              
                              const data = payload[0].payload
                              if (data.isHelper) return null
                              
                              // Get the actual profile data to calculate waste in mm
                              let profileName = data.name
                              let wastePercent = data.waste
                              let wasteMm = 0
                              
                              // Calculate waste in mm based on the filter context
                              if (chartFilterProfile === 'all' && chartFilterStockLength === 'all') {
                                // All profiles view - get total waste from profile
                                const profile = nestingReport.profiles.find(p => p.profile_name === data.name)
                                if (profile) {
                                  wasteMm = profile.total_waste
                                  profileName = profile.profile_name
                                }
                              } else if (chartFilterProfile !== 'all' && chartFilterStockLength === 'all') {
                                // Specific profile, all stock lengths - showing stock length breakdown
                                profileName = chartFilterProfile
                                const profile = nestingReport.profiles.find(p => p.profile_name === chartFilterProfile)
                                if (profile && data.stockLength) {
                                  const patternsForStock = profile.cutting_patterns.filter(p => p.stock_length === Number(data.stockLength))
                                  wasteMm = patternsForStock.reduce((sum, p) => sum + p.waste, 0) / patternsForStock.length
                                }
                              } else if (chartFilterProfile === 'all' && chartFilterStockLength !== 'all') {
                                // All profiles, specific stock length
                                const profile = nestingReport.profiles.find(p => p.profile_name === data.name)
                                if (profile) {
                                  const patternsForStock = profile.cutting_patterns.filter(p => p.stock_length === Number(chartFilterStockLength))
                                  wasteMm = patternsForStock.reduce((sum, p) => sum + p.waste, 0) / patternsForStock.length
                                  profileName = profile.profile_name
                                }
                              } else {
                                // Specific profile and stock length - individual bars
                                profileName = chartFilterProfile
                                const profile = nestingReport.profiles.find(p => p.profile_name === chartFilterProfile)
                                if (profile) {
                                  const patternsForStock = profile.cutting_patterns.filter(p => p.stock_length === Number(chartFilterStockLength))
                                  const barIndex = parseInt(data.name.replace('Bar ', '')) - 1
                                  if (patternsForStock[barIndex]) {
                                    wasteMm = patternsForStock[barIndex].waste
                                  }
                                }
                              }
                              
                              return (
                                <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                                  <div className="space-y-2">
                                    <div className="font-semibold text-foreground border-b border-border pb-2">
                                      {profileName}
                                    </div>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Waste:</span>
                                        <span className="font-semibold text-primary">{wastePercent}%</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Waste (mm):</span>
                                        <span className="font-medium text-foreground">{wasteMm.toFixed(0)}mm</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          
                          <Area
                            type="monotone"
                            dataKey="waste"
                            stroke="none"
                            fill="url(#areaGradient)"
                            isAnimationActive={true}
                            animationDuration={2000}
                            animationEasing="ease-out"
                          />
                          
                          <Line
                            type="monotone"
                            dataKey="waste"
                            stroke="url(#lineGradient)"
                            strokeWidth={3}
                            fill="none"
                            dot={(props: any) => {
                              const { cx, cy, payload, index } = props
                              // Hide dots for helper points
                              if (payload?.isHelper) return <></>
                              
                              // Calculate delay: dot appears when line reaches it
                              // Line animation is 2000ms linear, so timing is proportional
                              const totalPoints = chartData.length
                              const delay = totalPoints > 1 ? (index / (totalPoints - 1)) * 2000 : 0
                              
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={originalDataLength === 1 ? 8 : 6}
                                  fill="#084242"
                                  stroke="#fff"
                                  strokeWidth={2}
                                  style={{
                                    opacity: 0,
                                    animation: `dotInstantAppear 1ms linear ${delay}ms forwards`
                                  }}
                                />
                              )
                            }}
                            isAnimationActive={true}
                            animationDuration={2000}
                            animationEasing="ease-out"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No data available for the selected filters
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
                      )
                    })()}
                    </div>
                  )}

                  {/* Tab 2: Bill of Materials Summary */}
                  {activeReportTab === 'bom' && (
                    <div>
            {/* Section 1: BOM Summary */}
            <div className="mb-8 page-break-after">
              {/* Summary Cards */}
              {(() => {
                // Calculate totals for metric cards
                // Count only profiles that have successfully nested parts (not just error parts)
                let totalProfiles = nestingReport.profiles.filter(profile => {
                  // Check if profile has any actual nested parts (stock lengths used > 0)
                  const hasNestedParts = Object.values(profile.stock_lengths_used || {}).some(count => count > 0)
                  return hasNestedParts
                }).length
                
                let totalStockLengthM = 0
                let totalStockWeightT = 0
                let totalCutsQty = 0

                nestingReport.profiles.forEach(profile => {
                  const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                  let weightPerMeter = 0
                  if (profileData && profile.total_length > 0) {
                    const totalLengthM = profile.total_length / 1000.0
                    weightPerMeter = profileData.total_weight / totalLengthM
                  }

                  Object.entries(profile.stock_lengths_used)
                    .filter(([_, barCount]) => barCount > 0)
                    .forEach(([stockLengthStr, barCount]) => {
                      const stockLength = parseFloat(stockLengthStr)
                      const stockLengthM = stockLength / 1000.0
                      
                      // Add to total stock length
                      totalStockLengthM += stockLengthM * barCount
                      
                      // Add to total weight
                      const tonnage = (weightPerMeter * stockLengthM * barCount) / 1000.0
                      totalStockWeightT += tonnage
                      
                      // Add to total cuts (only purchased patterns)
                      const patternsForThisStock = profile.cutting_patterns.filter(
                        p => Math.abs(p.stock_length - stockLength) < 0.01 && (p as any).stock_type !== 'leftover'
                      )
                      const cuts = patternsForThisStock.reduce((sum, pattern) => {
                        return sum + Math.max(0, pattern.parts.length - 1)
                      }, 0)
                      totalCutsQty += cuts
                    })
                })

                return (
                  <AnimatedBOMMetricCards 
                    totalProfiles={totalProfiles}
                    totalStockLengthM={totalStockLengthM}
                    totalStockWeightT={totalStockWeightT}
                    totalCutsQty={totalCutsQty}
                    shouldAnimate={!animatedTabs.has('bom')}
                  />
                )
              })()}

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Bill of Materials</h2>
                
                {/* Combined Export Button */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                  {/* Export to Excel - Left Side */}
                  <button
                    onClick={handleExportBOMToExcel}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <img src="/Icons/Excel.svg" alt="Excel" className="w-6 h-6" />
                    <span className="text-sm font-medium text-gray-700">Export to Excel</span>
                  </button>
                  
                  {/* Vertical Divider */}
                  <div className="w-px h-8 bg-gray-300"></div>
                  
                  {/* Export to PDF - Right Side */}
                  <button
                    onClick={() => setShowBOMModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <img src="/Icons/Pdf.svg" alt="PDF" className="w-6 h-6" />
                    <span className="text-sm font-medium text-gray-700">Export to PDF</span>
                  </button>
                </div>
              </div>
              
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100 hover:bg-gray-100 h-16">
                        <TableHead className="text-gray-700 font-semibold h-16 text-base w-[20%] pl-6">Profile Name</TableHead>
                        <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[11.4%]">Stock Length (m)</TableHead>
                        <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[11.4%]">Quantity</TableHead>
                        <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[11.4%]">Weight (t)</TableHead>
                        <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[11.4%]">Cuts qty</TableHead>
                        <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[11.4%] bg-gray-200 pl-4">Waste (t)</TableHead>
                        <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[11.4%] bg-gray-200">Waste (m)</TableHead>
                        <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[11.4%] bg-gray-200 pr-6">Waste (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nestingReport.profiles.map((profile, profileIdx) => {
                        // Get profile data from report to calculate weight per meter
                        const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                        
                        // Calculate weight per meter (kg/m) from report data
                        // weight_per_meter = total_weight_kg / (total_length_mm / 1000)
                        let weightPerMeter = 0
                        if (profileData && profile.total_length > 0) {
                          const totalLengthM = profile.total_length / 1000.0  // Convert mm to meters
                          weightPerMeter = profileData.total_weight / totalLengthM  // kg per meter
                        }
                        
                        // Group by stock length for this profile
                        // Filter out entries with 0 bars - only show active bars
                        const stockLengthEntries = Object.entries(profile.stock_lengths_used)
                          .filter(([_, barCount]) => barCount > 0)
                        
                        return stockLengthEntries.map(([stockLengthStr, barCount], stockIdx) => {
                          const stockLength = parseFloat(stockLengthStr)  // in mm
                          const stockLengthM = stockLength / 1000.0  // Convert to meters
                          
                          // Calculate tonnage: (weight_per_meter_kg) * (stock_length_m) * (number_of_bars) / 1000
                          const tonnage = (weightPerMeter * stockLengthM * barCount) / 1000.0  // tonnes
                          
                          // Calculate number of cuts for this stock length
                          // Count patterns that use this stock length (only purchased - BOM is for items to buy)
                          const patternsForThisStock = profile.cutting_patterns.filter(
                            p => Math.abs(p.stock_length - stockLength) < 0.01 && (p as any).stock_type !== 'leftover'
                          )
                          
                          // Number of cuts = sum of (parts per bar - 1) for each bar
                          // Each bar has (number_of_parts - 1) cuts
                          const totalCuts = patternsForThisStock.reduce((sum, pattern) => {
                            return sum + Math.max(0, pattern.parts.length - 1)  // -1 because last part doesn't need a cut
                          }, 0)
                          
                          // Calculate total waste for this stock length
                          // Sum of waste from all patterns using this stock length
                          const totalWasteMm = patternsForThisStock.reduce((sum, pattern) => {
                            return sum + (pattern.waste || 0)
                          }, 0)
                          
                          // Calculate waste in meters
                          const totalWasteM = totalWasteMm / 1000.0
                          
                          // Calculate waste tonnage: (waste_mm / 1000) * weight_per_meter / 1000
                          const wasteTonnage = weightPerMeter > 0 && totalWasteMm > 0
                            ? (totalWasteM * weightPerMeter) / 1000.0
                            : 0
                          
                          // Get waste percentage for this stock length
                          // Average waste percentage across patterns using this stock length
                          // NOTE: Waste % is the same whether calculated by length or tonnage
                          // because weight per meter is constant for a profile
                          const wasteForThisStock = patternsForThisStock.length > 0
                            ? patternsForThisStock.reduce((sum, p) => sum + p.waste_percentage, 0) / patternsForThisStock.length
                            : profile.total_waste_percentage
                          
                          return (
                            <TableRow key={`${profileIdx}-${stockIdx}`} className="h-12">
                              <TableCell className="font-medium h-12 pl-6">
                                {profile.profile_name}
                              </TableCell>
                              <TableCell className="text-right h-12">
                                {(stockLength / 1000).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right h-12">
                                {barCount}
                              </TableCell>
                              <TableCell className="text-right h-12">
                                {tonnage > 0 ? tonnage.toFixed(3) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right h-12">
                                {totalCuts}
                              </TableCell>
                              <TableCell className="text-right h-12 bg-muted/70 pl-4">
                                {wasteTonnage > 0 ? wasteTonnage.toFixed(3) : '0.000'}
                              </TableCell>
                              <TableCell className="text-right h-12 bg-muted/70">
                                {totalWasteM > 0 ? totalWasteM.toFixed(2) : '0.00'}
                              </TableCell>
                              <TableCell className="text-right h-12 text-foreground bg-muted/70 pr-6">
                                {wasteForThisStock.toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          )
                        })
                      })}
                    </TableBody>
                    <tfoot>
                      <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50 h-12">
                        <TableCell className="h-12 pl-6">Total</TableCell>
                        <TableCell className="text-right h-12">
                          {/* Calculate total stock length in meters */}
                          {nestingReport.profiles.reduce((total, profile) => {
                            return total + Object.entries(profile.stock_lengths_used || {})
                              .filter(([_, barCount]) => barCount > 0)
                              .reduce((sum, [stockLengthStr, barCount]) => {
                                const stockLengthM = parseFloat(stockLengthStr) / 1000.0
                                return sum + (stockLengthM * barCount)
                              }, 0)
                          }, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right h-12">
                          {nestingReport.profiles.reduce((sum, profile) => {
                            return sum + Object.values(profile.stock_lengths_used || {}).reduce((a, b) => a + b, 0)
                          }, 0)}
                        </TableCell>
                        <TableCell className="text-right h-12">
                            {nestingReport.profiles.reduce((total, profile) => {
                              const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                              if (!profileData || profile.total_length === 0) return total
                              
                              const weightPerMeter = profileData.total_weight / (profile.total_length / 1000.0)
                              const profileTonnage = Object.entries(profile.stock_lengths_used).reduce((sum, [stockLengthStr, barCount]) => {
                                const stockLengthM = parseFloat(stockLengthStr) / 1000.0
                                return sum + (weightPerMeter * stockLengthM * barCount) / 1000.0
                              }, 0)
                              
                              return total + profileTonnage
                            }, 0).toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right h-12">
                          {nestingReport.profiles.reduce((total, profile) => {
                            const purchasedPatterns = profile.cutting_patterns.filter((p: any) => p.stock_type !== 'leftover')
                            return total + purchasedPatterns.reduce((sum, pattern) => {
                              return sum + Math.max(0, pattern.parts.length - 1)
                            }, 0)
                          }, 0)}
                        </TableCell>
                        <TableCell className="text-right h-12 bg-muted/80 pl-4">
                            {nestingReport.profiles.reduce((total, profile) => {
                              const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                              if (!profileData || profile.total_length === 0) return total
                              
                              const weightPerMeter = profileData.total_weight / (profile.total_length / 1000.0)
                              const purchasedPatterns = profile.cutting_patterns.filter((p: any) => p.stock_type !== 'leftover')
                              const profileWasteTonnage = purchasedPatterns.reduce((sum, pattern) => {
                                const wasteM = (pattern.waste || 0) / 1000.0
                                return sum + (wasteM * weightPerMeter) / 1000.0
                              }, 0)
                              
                              return total + profileWasteTonnage
                            }, 0).toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right h-12 bg-muted/80">
                          {nestingReport.profiles.reduce((total, profile) => {
                            const purchasedPatterns = profile.cutting_patterns.filter((p: any) => p.stock_type !== 'leftover')
                            const profileWasteM = purchasedPatterns.reduce((sum, pattern) => {
                              return sum + ((pattern.waste || 0) / 1000.0)
                            }, 0)
                            return total + profileWasteM
                          }, 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right h-12 text-foreground bg-muted/80 pr-6">
                        {(() => {
                          const totalPurchasedWaste = nestingReport.profiles.reduce((sum, profile) => {
                            const purchasedPatterns = profile.cutting_patterns.filter((p: any) => p.stock_type !== 'leftover')
                            return sum + purchasedPatterns.reduce((s, p) => s + (p.waste || 0), 0)
                          }, 0)
                          const totalPurchasedStock = nestingReport.profiles.reduce((sum, profile) => {
                            const purchasedPatterns = profile.cutting_patterns.filter((p: any) => p.stock_type !== 'leftover')
                            return sum + purchasedPatterns.reduce((s, p) => s + p.stock_length, 0)
                          }, 0)
                          const avgWastePct = totalPurchasedStock > 0 ? (totalPurchasedWaste / totalPurchasedStock * 100) : 0
                          return `${avgWastePct.toFixed(2)}%`
                        })()}
                      </TableCell>
                    </TableRow>
                    </tfoot>
                  </Table>
                </div>
              </div>
            </div>

            {/* Error Parts Table - Show all rejected parts that exceed stock lengths */}
            {(() => {
              // Collect all rejected parts from all profiles - each part as separate row (no merging)
              const allErrorParts: Array<{
                profile_name: string
                reference: string
                length: number
                product_id: number
              }> = []
              
              nestingReport.profiles.forEach(profile => {
                if (profile.rejected_parts && profile.rejected_parts.length > 0) {
                  profile.rejected_parts.forEach(rejectedPart => {
                    const r = (rejectedPart as any)
                    const ref = r.reference?.trim?.() || ''
                    const partName = ref || `Part ${rejectedPart.product_id}`
                    
                    allErrorParts.push({
                      profile_name: profile.profile_name,
                      reference: partName,
                      length: rejectedPart.length,
                      product_id: rejectedPart.product_id || 0
                    })
                  })
                }
              })

              if (allErrorParts.length === 0) {
                return null
              }

              return (
                <div className="mb-8 page-break-after">
                  <h2 className="text-2xl font-bold mb-4">Error Parts</h2>
                  
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100 hover:bg-gray-100 h-16">
                            <TableHead className="text-gray-700 font-semibold h-16 text-base w-[20%] pl-6">Profile Type</TableHead>
                            <TableHead className="text-gray-700 font-semibold h-16 text-base w-[20%]">Part Name</TableHead>
                            <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[20%]">Cut Length (mm)</TableHead>
                            <TableHead className="text-gray-700 text-right font-semibold h-16 text-base w-[20%] pr-4">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold h-16 text-base w-[20%] pl-6 pr-6">Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allErrorParts.map((part, idx) => (
                            <TableRow key={`${part.profile_name}-${part.product_id}-${idx}`}>
                              <TableCell className="font-medium pl-6">
                                {part.profile_name}
                              </TableCell>
                              <TableCell>
                                {part.reference}
                              </TableCell>
                              <TableCell className="text-right">
                                {Math.round(part.length)}
                              </TableCell>
                              <TableCell className="text-right pr-4">
                                1
                              </TableCell>
                              <TableCell className="text-sm pl-6 pr-6">
                                Part Length &gt; stock length
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
                      )
                    })()}
                    </div>
                  )}

                  {/* Tab 3: Cutting Plan */}
                  {activeReportTab === 'cutting' && (
                    <div>
            {/* Section 2: Cutting Patterns */}
            <div className="page-break-before">
              {/* Cutting Settings Cards */}
              {(() => {
                // Calculate total cuts for all profiles
                let totalCutsQty = 0
                
                nestingReport.profiles.forEach(profile => {
                  Object.entries(profile.stock_lengths_used)
                    .filter(([_, barCount]) => barCount > 0)
                    .forEach(([stockLengthStr, barCount]) => {
                      const stockLength = parseFloat(stockLengthStr)
                      const patternsForThisStock = profile.cutting_patterns.filter(
                        p => Math.abs(p.stock_length - stockLength) < 0.01
                      )
                      const cuts = patternsForThisStock.reduce((sum, pattern) => {
                        return sum + Math.max(0, pattern.parts.length - 1)
                      }, 0)
                      totalCutsQty += cuts
                    })
                })
                
                return (
                  <AnimatedCuttingMetricCards 
                    stockToleranceEnabled={(nestingReport.settings?.stock_tolerance ?? 0) > 0}
                    stockToleranceValue={nestingReport.settings?.stock_tolerance ?? 0}
                    trimValue={nestingReport.settings?.trim ?? 5.0}
                    kerfValue={nestingReport.settings?.kerf ?? 3.0}
                    totalCutsQty={totalCutsQty}
                    shouldAnimate={!animatedTabs.has('cutting')}
                  />
                )
              })()}
              
              {/* Profile Filter Multi-Select */}
              <div className="py-8 mb-6">
                <div className="flex items-end gap-4">
                    <div className="flex-1 max-w-md">
                      <Label className="mb-2 block text-sm font-medium">
                        Filter Profiles
                      </Label>
                  <div className="relative">
                    <button
                      ref={profileFilterRef}
                      id="profile-filter"
                      type="button"
                      onClick={() => {
                        if (profileFilterRef.current) {
                          const rect = profileFilterRef.current.getBoundingClientRect()
                          setDropdownPosition({
                            top: rect.bottom + 4,
                            left: rect.left,
                            width: rect.width
                          })
                        }
                        setIsProfileDropdownOpen(prev => !prev)
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 border border-input bg-background rounded-md text-sm hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <span>
                        {selectedProfilesForDisplay.size === nestingReport.profiles.length
                          ? 'All Profiles'
                          : selectedProfilesForDisplay.size === 0
                          ? 'No profiles selected'
                          : `${selectedProfilesForDisplay.size} profile${selectedProfilesForDisplay.size > 1 ? 's' : ''} selected`}
                      </span>
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isProfileDropdownOpen && (
                      <div
                        id="profile-dropdown"
                        className="fixed z-[100] bg-background border border-border rounded-md shadow-lg max-h-[400px] overflow-y-auto"
                        style={{
                          width: dropdownPosition.width + 'px',
                          top: dropdownPosition.top + 'px',
                          left: dropdownPosition.left + 'px'
                        }}
                      >
                      <div className="p-2 border-b bg-muted/30">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedProfilesForDisplay(new Set())
                          }}
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="p-1">
                        {nestingReport.profiles.map((profile) => {
                          const isSelected = selectedProfilesForDisplay.has(profile.profile_name)
                          return (
                            <button
                              key={profile.profile_name}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const newSelected = new Set(selectedProfilesForDisplay)
                                if (isSelected) {
                                  newSelected.delete(profile.profile_name)
                                } else {
                                  newSelected.add(profile.profile_name)
                                }
                                setSelectedProfilesForDisplay(newSelected)
                              }}
                              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/50 rounded transition-colors text-left"
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-primary border-primary' : 'border-input'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="flex-1 font-medium">{profile.profile_name}</span>
                              <span className="text-xs text-muted-foreground">({profile.total_parts} parts)</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    )}
                  </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSelectedProfilesForDisplay(new Set(nestingReport.profiles.map(p => p.profile_name)))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm"
                      >
                        Reset Filter
                      </button>
                      <div className="text-sm text-muted-foreground">
                        {selectedProfilesForDisplay.size} of {nestingReport.profiles.length} profiles
                      </div>
                    </div>
                    <div className="ml-auto">
                      {/* Export Button - New Style (Excel hidden for now) */}
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => setShowCuttingPlanModal(true)}
                          disabled={selectedProfilesForDisplay.size === 0}
                          className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <img src="/Icons/Pdf.svg" alt="PDF" className="w-6 h-6" />
                          <span className="text-sm font-medium text-gray-700">Export to PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
              </div>
              
              {(() => {
                const profilesToShow = selectedProfilesForDisplay.size === 0 
                  ? [] 
                  : nestingReport.profiles
                      .filter(profile => selectedProfilesForDisplay.has(profile.profile_name))
                      .filter(profile => profile.cutting_patterns.length > 0)
                
                if (profilesToShow.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg mb-2">No profiles selected</p>
                      <p className="text-sm">Please select at least one profile from the filter above to view cutting plans.</p>
                    </div>
                  )
                }
                
                return profilesToShow.map((profile) => {
                const profileKey = profile.profile_name
                // Get original index from nestingReport.profiles for consistent SVG IDs
                const originalProfileIdx = nestingReport.profiles.findIndex(p => p.profile_name === profile.profile_name)
                const isExpanded = expandedProfiles.has(profileKey)
                
                const toggleProfile = () => {
                  const newExpanded = new Set(expandedProfiles)
                  if (isExpanded) {
                    newExpanded.delete(profileKey)
                  } else {
                    newExpanded.add(profileKey)
                  }
                  setExpandedProfiles(newExpanded)
                }
                
                return (
                  <div key={originalProfileIdx} className="mb-4 border rounded-xl">
                    {/* Collapsible header */}
                    <button
                      onClick={toggleProfile}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors rounded-t-xl"
                    >
                      <h4 className="font-semibold text-lg text-left">
                        {profile.profile_name}
                      </h4>
                      <img 
                        src={isExpanded ? "/Icons/minus icon.svg" : "/Icons/plus icon.svg"} 
                        alt={isExpanded ? "Collapse" : "Expand"} 
                        className="w-6 h-6"
                      />
                    </button>
                  
                    {/* Collapsible content */}
                    {isExpanded && (
                      <div className="p-4">
                  {profile.cutting_patterns.map((pattern, patternIdx) => {
                    console.log(`[STOCKBAR] Pattern ${patternIdx + 1}: stock_type="${pattern.stock_type}", stock_length=${pattern.stock_length}`)
                    return (
                    <div key={patternIdx} id={`stockbar-full-${originalProfileIdx}-${patternIdx}`} className="mb-4 p-3 bg-white rounded-xl">
                      {/* Stockbar Title */}
                      <div className="mb-3 flex items-center gap-2">
                        {pattern.stock_type === 'leftover' && (
                          <Recycle className="w-5 h-5 text-orange-500" />
                        )}
                        <h5 className={`text-base font-medium ${pattern.stock_type === 'leftover' ? 'text-orange-500' : 'text-muted-foreground'}`}>
                          {pattern.stock_type === 'leftover' ? 'Leftover ' : ''}Stockbar {patternIdx + 1}
                        </h5>
                      </div>
                      
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-4">
                          {/* Info Table with Icons */}
                          <div className="flex items-center gap-3 border rounded-lg px-3 py-1.5 bg-muted/20">
                            {/* Length */}
                            <div className="flex items-center gap-1.5">
                              <img src="/Icons/length for section.svg" alt="Length" className="w-4 h-4" />
                              <span className="text-sm font-medium">{pattern.stock_length.toLocaleString('en-US')}mm</span>
                            </div>
                            
                            <div className="w-px h-4 bg-border"></div>
                            
                            {/* Tolerance - always show, 0mm for leftovers */}
                            <div className="flex items-center gap-1.5">
                              <img src="/Icons/tolerance for section.svg" alt="Tolerance" className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {pattern.stock_type === 'leftover' ? '0' : (nestingReport.settings?.stock_tolerance ?? 0).toFixed(0)}mm
                              </span>
                            </div>
                            
                            <div className="w-px h-4 bg-border"></div>
                            
                            {/* Trim - 0mm for leftovers, actual value for purchased */}
                            <div className="flex items-center gap-1.5">
                              <img src="/Icons/trim for section.svg" alt="Trim" className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {pattern.stock_type === 'leftover' ? '0' : (nestingReport.settings?.trim ?? 5.0).toFixed(0)}mm
                              </span>
                            </div>
                            
                            <div className="w-px h-4 bg-border"></div>
                            
                            {/* Kerf */}
                            <div className="flex items-center gap-1.5">
                              <img src="/Icons/kerf for section.svg" alt="Kerf" className="w-4 h-4" />
                              <span className="text-sm font-medium">{(nestingReport.settings?.kerf ?? 3.0).toFixed(0)}mm</span>
                            </div>
                          </div>
                          
                          {(pattern as any).exceeds_stock && (
                            <span className="ml-2 text-red-600 font-semibold text-xs">
                              ⚠️ Part exceeds stock length!
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 bg-muted/20"
                            style={
                              pattern.waste_percentage <= 20
                                ? {
                                    backgroundColor: 'rgba(28, 185, 126, 0.12)',
                                    borderColor: 'rgba(0, 129, 122, 0.4)'
                                  }
                                : {}
                            }
                          >
                            <img src="/Icons/Waste icon.svg" alt="Waste" className="w-4 h-4" />
                            <span 
                              className="text-sm font-medium"
                              style={
                                pattern.waste_percentage <= 20
                                  ? { color: '#00312F' }
                                  : {}
                              }
                            >
                              {Math.round(pattern.waste).toLocaleString('en-US')}mm ({pattern.waste_percentage.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Visual cutting diagram - Simple bar with segments and cut lines */}
                      <div className="mb-4 mt-4">
                        {/* Container with padding for labels */}
                        <div className="relative">
                          {/* Stock bar visualization - boundary-based cut lines */}
                          {/* Container with border matching the SVG border style */}
                          <div id={`stockbar-container-${originalProfileIdx}-${patternIdx}`} className="relative bg-white rounded mb-3 border border-gray-300" style={{ height: '60px', overflow: 'hidden' }}>
                            {/* Text labels rendered as absolute positioned divs to prevent SVG scaling */}
                            {/* Labels are rendered inside the SVG function to access partPositions */}
                            <svg key={`svg-${originalProfileIdx}-${patternIdx}`} id={`stockbar-svg-${originalProfileIdx}-${patternIdx}`} className="absolute inset-0 w-full h-full" viewBox="0 0 1000 60" preserveAspectRatio="none" shapeRendering="crispEdges">
                              <defs>
                                <clipPath id={`clip-${originalProfileIdx}-${patternIdx}`}>
                                  <rect x="0" y="0" width="1000" height="60" />
                                </clipPath>
                              </defs>
                              {/* Stock bar border will be drawn after calculating actual dimensions */}
                              {(() => {
                                try {
                                  // Safety check: ensure pattern has required data
                                  if (!pattern || !pattern.parts || !Array.isArray(pattern.parts) || pattern.parts.length === 0) {
                                    return (
                                      <text x="500" y="30" fill="#666" fontSize="12" textAnchor="middle" dominantBaseline="middle">
                                        No parts data available
                                      </text>
                                    )
                                  }
                                  
                                  if (!pattern.stock_length || pattern.stock_length <= 0) {
                                    return (
                                      <text x="500" y="30" fill="#666" fontSize="12" textAnchor="middle" dominantBaseline="middle">
                                        Invalid stock length
                                      </text>
                                    )
                                  }
                                const barHeight = 60
                                const totalWidth = 1000
                                const stockLengthMm = pattern.stock_length
                                const pxPerMm = totalWidth / stockLengthMm
                                const ANGLE_MATCH_TOL = 0.5 // Very strict tolerance - 56° vs 58° should NOT match
                                const allowTwoSlopes = true // Allow parts to have 2 sloped ends
                                const markerInset = 8 // Inset from part edge for end markers (px)
                                
                                // Use actual cut angle to compute diagonal offset (in px)
                                const degToRad = (deg: number) => (deg * Math.PI) / 180
                                const clamp = (value: number, min: number, max: number) =>
                                  Math.max(min, Math.min(max, value))
                                
                                const calcDiagOffset = (devDeg: number | null | undefined, partWidthPx: number) => {
                                  if (!devDeg || devDeg <= 0) return 0
                                  const raw = Math.tan(degToRad(devDeg)) * (barHeight - 1)
                                  const maxAllowed = Math.max(2, Math.min(partWidthPx * 0.45, barHeight - 2))
                                  return clamp(raw, 0, maxAllowed)
                                }
                                
                                // Calculate miter offset based on the angle and bar height
                                // The offset represents the horizontal distance of the diagonal cut
                                // For visual clarity, we use a reduced scale factor
                                // Minimum visual offset ensures even small slopes (< 5°) are visible
                                const calcBoundaryOffset = (devDeg: number | null | undefined, partWidthPx: number) => {
                                  if (!devDeg || devDeg <= 0) return 0
                                  // Calculate the horizontal offset for the miter cut
                                  // Use 20% of bar height instead of full height for better visual proportions
                                  const visualHeight = (barHeight - 1) * 0.2
                                  const raw = Math.tan(degToRad(devDeg)) * visualHeight
                                  // Use pure trigonometric calculation without artificial minimum
                                  // This ensures pixel-perfect proportional scaling at all screen sizes
                                  // Clamp to reasonable values: max 25% of part width to prevent overflow
                                  const maxAllowed = Math.min(partWidthPx * 0.25, visualHeight)
                                  return clamp(raw, 0, maxAllowed)
                                }
                                
                                // A) Helper: Parse angle robustly
                                const parseAngle = (value: any): number | null => {
                                  if (value === null || value === undefined) return null
                                  if (typeof value === 'number') {
                                    return Number.isFinite(value) ? value : null
                                  }
                                  if (typeof value === 'string') {
                                    // Extract first signed float from string (handles "Start: +8.7°" format)
                                    const match = value.match(/-?\d+(\.\d+)?/)
                                    if (match) {
                                      const n = parseFloat(match[0])
                                      return Number.isFinite(n) ? n : null
                                    }
                                    return null
                                  }
                                  return null
                                }
                                
                                // Robust angle convention detection and deviation calculation
                                const MIN_DEV_DEG = 1.0 // Minimum deviation to consider a miter
                                const NEAR_STRAIGHT_THRESHOLD = 0.5 // Force straight if deviation < this
                                const TWO_SLOPE_SANITY_THRESHOLD = 2.0 // If both slope, treat smaller one as straight if < this
                                
                                interface AngleAnalysis {
                                  rawAngle: number | null
                                  convention: 'ABS' | 'DEV' | null
                                  deviation: number | null
                                  isSlope: boolean
                                }
                                
                                // Analyze angle: detect convention and compute deviation
                                const analyzeAngle = (rawAngle: number | null): AngleAnalysis => {
                                  if (rawAngle === null) {
                                    return { rawAngle: null, convention: null, deviation: null, isSlope: false }
                                  }
                                  
                                  const absAngle = Math.abs(rawAngle)
                                  
                                  // Detect convention: if angle is between 60-120, treat as ABS (90° = straight)
                                  // Otherwise treat as DEV (0° = straight)
                                  let convention: 'ABS' | 'DEV'
                                  let deviation: number
                                  
                                  if (absAngle >= 60 && absAngle <= 120) {
                                    // ABSOLUTE convention: 90° = straight
                                    convention = 'ABS'
                                    deviation = Math.abs(rawAngle - 90)
                                  } else {
                                    // DEVIATION convention: 0° = straight
                                    convention = 'DEV'
                                    deviation = absAngle
                                  }
                                  
                                  // Near-straight guard: force straight if very close
                                  let isSlope = false
                                  if (convention === 'ABS' && deviation < NEAR_STRAIGHT_THRESHOLD) {
                                    isSlope = false // Force straight
                                  } else if (convention === 'DEV' && deviation < NEAR_STRAIGHT_THRESHOLD) {
                                    isSlope = false // Force straight
                                  } else {
                                    // Normal threshold check
                                    isSlope = deviation >= MIN_DEV_DEG
                                  }
                                  
                                  return { rawAngle, convention, deviation, isSlope }
                                }
                                
                                // A) Layout: Compute x positions by cumulative sum of part.length
                                // Use the order from the backend - it has already been optimized
                                // based on cut characteristics (straight cuts first, sloped cuts last)
                                // DO NOT re-sort here, as that would undo the backend optimization
                                const sortedParts = [...pattern.parts]
                                
                                // Calculate total length of all parts first
                                const totalPartsLengthMm = sortedParts.reduce((sum, part) => sum + (part.length || 0), 0)
                                
                                // Use true scale (pxPerMm) for positioning parts
                                // This ensures waste area is visible at the end
                                const wasteMm = pattern.waste || 0
                                
                                // Position parts without kerf gaps - gaps are visual only and shouldn't affect positioning
                                // Parts are positioned flush against each other based on their actual lengths
                                let cumulativeX = 0
                                const partPositions = sortedParts.map((part, partIdx) => {
                                  const lengthMm = part.length || 0
                                  const xStart = cumulativeX
                                  const xEnd = cumulativeX + (lengthMm * pxPerMm)
                                  
                                  // Move to next part position (no gap)
                                  cumulativeX = xEnd
                                  return { part, xStart, xEnd, lengthMm }
                                })
                                
                                const numParts = partPositions.length
                                const lastPartIdx = numParts - 1
                                // Calculate exact used length from actual part positions
                                const usedLengthMm = totalPartsLengthMm
                                
                                // Build orderByName map to group identical parts (by reference name)
                                const orderByName = new Map<string, Array<{ idx: number; part: any }>>()
                                partPositions.forEach((pos, idx) => {
                                  const partData = pos.part?.part || {}
                                  const partName = String(
                                    partData.reference || partData.element_name || partData.product_id || `b${idx + 1}`
                                  )
                                  if (!orderByName.has(partName)) {
                                    orderByName.set(partName, [])
                                  }
                                  orderByName.get(partName)!.push({ idx, part: pos.part })
                                })
                                
                                // DEBUG: Log overall pattern calculation
                                console.log(`[NESTING_DEBUG] Pattern ${patternIdx} overall calculation:`, {
                                  stockLengthMm: pattern.stock_length,
                                  totalWidth: 1000,
                                  pxPerMm,
                                  numParts,
                                  lastPartIdx,
                                  lastPartXEnd_raw: partPositions.length > 0 ? partPositions[lastPartIdx].xEnd : 0,
                                  usedLengthMm,
                                  usedLengthPx: usedLengthMm * pxPerMm,
                                  waste_mm: pattern.waste,
                                  cumulativeX_final: partPositions.length > 0 ? partPositions[lastPartIdx].xEnd : 0,
                                  firstPartXStart: partPositions.length > 0 ? partPositions[0].xStart : 0
                                })
                                
                                // Create mapping from part name to its number in the cutting list table
                                const partNameToNumber = new Map<string, number>()
                                try {
                                  const partGroups = new Map<string, { name: string, length: number, count: number }>()
                                  
                                  pattern.parts.forEach((part) => {
                                    try {
                                      const partName = getDisplayPartName(part)
                                      const partLength = part?.length || 0
                                      
                                      if (partGroups.has(partName)) {
                                        const existing = partGroups.get(partName)!
                                        existing.count += 1
                                      } else {
                                        partGroups.set(partName, {
                                          name: partName,
                                          length: partLength,
                                          count: 1
                                        })
                                      }
                                    } catch (e) {
                                      // Ignore individual part errors
                                    }
                                  })
                                  
                                  // Convert to array and sort by length (longest first, same as cutting list table)
                                  const sortedGroups = Array.from(partGroups.values()).sort((a, b) => {
                                    // Sort by length descending (longest first)
                                    return b.length - a.length
                                  })
                                  
                                  // Create mapping: part name -> table number (1-indexed)
                                  sortedGroups.forEach((group, idx) => {
                                    partNameToNumber.set(group.name, idx + 1)
                                  })
                                  
                                } catch (e) {
                                  // If mapping fails, labels will fall back to part names
                                }
                                
                                // B) Define "ends" per part (normalize inputs with deviation)
                                interface PartEnd {
                                  type: 'straight' | 'miter'
                                  rawAngle: number | null
                                  deviation: number | null
                                  angleSign: 1 | -1
                                }
                                
                                const partEnds = partPositions.map(({ part }, partIdx) => {
                                  try {
                                    if (!part) {
                                      throw new Error(`Part at index ${partIdx} is undefined`)
                                    }
                                    
                                  const slopeInfo = (part as any).slope_info || {}
                                  
                                  // Parse raw angles (for display purposes)
                                  const startRawAngle = parseAngle(slopeInfo.start_angle)
                                  const endRawAngle = parseAngle(slopeInfo.end_angle)
                                  
                                  // Use backend's has_slope flags if available (more reliable than recalculating)
                                  // Only recalculate from angles if flags are not provided (for backwards compatibility)
                                  const hasBackendFlags = slopeInfo.start_has_slope !== undefined || slopeInfo.end_has_slope !== undefined
                                  
                                  let startIsSlope: boolean
                                  let endIsSlope: boolean
                                  let startDeviation: number | null = null
                                  let endDeviation: number | null = null
                                  
                                  if (hasBackendFlags) {
                                    // Trust the backend's determination
                                    startIsSlope = slopeInfo.start_has_slope === true
                                    endIsSlope = slopeInfo.end_has_slope === true
                                    
                                    // Calculate deviation from angles for boundary detection
                                    // But respect backend's slope flags for rendering
                                    if (startRawAngle !== null) {
                                      const startAnalysis = analyzeAngle(startRawAngle)
                                      // Use calculated deviation for boundary matching, but...
                                      if (startIsSlope) {
                                        // Backend says it's a slope - calculate proper deviation
                                        startDeviation = startAnalysis.deviation
                                      } else {
                                        // Backend says no slope - still calculate deviation for boundary detection
                                        // but keep it for matching purposes (don't set to 0)
                                        startDeviation = startAnalysis.deviation || 0
                                      }
                                    } else {
                                      startDeviation = 0
                                    }
                                    
                                    if (endRawAngle !== null) {
                                      const endAnalysis = analyzeAngle(endRawAngle)
                                      if (endIsSlope) {
                                        // Backend says it's a slope - calculate proper deviation
                                        endDeviation = endAnalysis.deviation
                                      } else {
                                        // Backend says no slope - still calculate deviation for boundary detection
                                        endDeviation = endAnalysis.deviation || 0
                                      }
                                    } else {
                                      endDeviation = 0
                                    }
                                  } else {
                                    // Fallback: recalculate from angles (for backwards compatibility)
                                    const startAnalysis = analyzeAngle(startRawAngle)
                                    const endAnalysis = analyzeAngle(endRawAngle)
                                    
                                    startIsSlope = startAnalysis.isSlope
                                    endIsSlope = endAnalysis.isSlope
                                    startDeviation = startAnalysis.deviation
                                    endDeviation = endAnalysis.deviation
                                    
                                    // Sanity fallback: if both ends are slope AND one is tiny, treat tiny one as straight
                                    if (startIsSlope && endIsSlope) {
                                      const startDev = startAnalysis.deviation || 0
                                      const endDev = endAnalysis.deviation || 0
                                      const minDev = Math.min(startDev, endDev)
                                      
                                      if (minDev < TWO_SLOPE_SANITY_THRESHOLD) {
                                        if (startDev < endDev) {
                                          startIsSlope = false
                                        } else {
                                          endIsSlope = false
                                        }
                                      }
                                    }
                                  }
                                  
                                  const getAngleSign = (rawAngle: number | null): 1 | -1 => {
                                    if (rawAngle === null) return 1
                                    return rawAngle < 0 ? -1 : 1
                                  }
                                  
                                  const startCut: PartEnd = {
                                    type: startIsSlope ? 'miter' : 'straight',
                                    rawAngle: startRawAngle,
                                    deviation: startDeviation,
                                    angleSign: getAngleSign(startRawAngle)
                                  }
                                  
                                  const endCut: PartEnd = {
                                    type: endIsSlope ? 'miter' : 'straight',
                                    rawAngle: endRawAngle,
                                    deviation: endDeviation,
                                    angleSign: getAngleSign(endRawAngle)
                                  }
                                  
                                    // Debug logging for all parts
                                  const partName = part.part.reference || part.part.element_name || part.part.product_id || `b${partIdx + 1}`
                                    try {
                                      const startDevStr = startDeviation !== null ? startDeviation.toFixed(2) : 'null'
                                      const endDevStr = endDeviation !== null ? endDeviation.toFixed(2) : 'null'
                                      const backendFlag = hasBackendFlags ? `(backend: start=${slopeInfo.start_has_slope}, end=${slopeInfo.end_has_slope})` : '(recalculated)'
                                      console.log(`[ENDCLASS] id=${partName} startRaw=${startRawAngle} startDev=${startDevStr} startType=${startCut.type} endRaw=${endRawAngle} endDev=${endDevStr} endType=${endCut.type} ${backendFlag}`)
                                    } catch (e) {
                                      // Silently ignore logging errors
                                  }
                                  
                                  return { startCut, endCut }
                                  } catch (error) {
                                    // Fallback: return straight ends if there's any error
                                    console.error(`[ENDCLASS] Error processing part ${partIdx}:`, error)
                                    return {
                                      startCut: { type: 'straight' as const, rawAngle: null, deviation: null, angleSign: 1 },
                                      endCut: { type: 'straight' as const, rawAngle: null, deviation: null, angleSign: 1 }
                                    }
                                  }
                                })
                                
                                // D) Enforce per-part "slope budget" (if allowTwoSlopes is false)
                                // Note: We already normalized using deviation, so this is just for the allowTwoSlopes flag
                                let finalPartEnds = allowTwoSlopes 
                                  ? partEnds 
                                  : partEnds.map((ends) => {
                                      const { startCut, endCut } = ends
                                      const startMiter = startCut.type === 'miter'
                                      const endMiter = endCut.type === 'miter'
                                      
                                      if (startMiter && endMiter) {
                                        // Keep only the stronger slope (using deviation)
                                        const startDev = startCut.deviation || 0
                                        const endDev = endCut.deviation || 0
                                        
                                        const straightCut: PartEnd = { type: 'straight' as const, rawAngle: null, deviation: null, angleSign: 1 as const }
                                        
                                        if (startDev > endDev) {
                                          return { startCut, endCut: straightCut }
                                        } else {
                                          return { startCut: straightCut, endCut }
                                        }
                                      }
                                      
                                      return { startCut, endCut }
                                    })
                                
                                // LOCAL CANONICALIZATION: DISABLED
                                // The backend already sends parts with correct orientations for nesting
                                // Canonicalization was interfering with the backend's orientation choices
                                // The flipping logic below will handle alignment for boundary sharing
                                const localCanonicalMap = new Map<string, { startDev: number; endDev: number; startSign: number; endSign: number; startType: string; endType: string }>()
                                
                                // Helper to get part name
                                const getPartNameForIdx = (idx: number) => {
                                  const partData = partPositions[idx]?.part?.part || {}
                                  return String(
                                    partData.reference || partData.element_name || partData.product_id || `b${idx + 1}`
                                  )
                                }
                                
                                // DEBUG: Log finalPartEnds BEFORE canonicalization for first 3 parts
                                for (let i = 0; i < Math.min(3, numParts); i++) {
                                  const partName = getPartNameForIdx(i)
                                  const ends = finalPartEnds[i]
                                  if (ends) {
                                    console.log(`[PRE-CANON] Part ${i} (${partName}): startCut=${ends.startCut.type}(${(ends.startCut.deviation || 0).toFixed(2)}) endCut=${ends.endCut.type}(${(ends.endCut.deviation || 0).toFixed(2)})`)
                                  }
                                }
                                
                                // DISABLED: First pass collection
                                // partPositions.forEach(({ part }, idx) => {
                                //   ...canonicalization code...
                                // })
                                
                                // DISABLED: Second pass application
                                // The backend sends parts with correct orientations, trust that instead
                                // finalPartEnds = finalPartEnds.map((ends, idx) => {
                                //   ...canonicalization application code...
                                // })
                                
                                // SMART ORIENTATION: For parts with two different slopes, orient them to maximize boundary sharing
                                // When consecutive parts have the same name, we want them to share boundaries
                                const partFlipStates = new Array(numParts).fill(false)
                                
                                // Step 1: Optimize first part - always start with straight cut if possible to minimize waste
                                if (numParts > 0) {
                                  const firstPart = finalPartEnds[0]
                                  if (firstPart) {
                                    const startDev = firstPart.startCut.deviation || 0
                                    const endDev = firstPart.endCut.deviation || 0
                                    const firstPartName = partPositions[0]?.part?.part?.reference || partPositions[0]?.part?.part?.element_name || 'part0'
                                    
                                    console.log(`[FIRST-PART-OPT] First part (${firstPartName}) cuts: start=${firstPart.startCut.type}(${startDev.toFixed(2)}°), end=${firstPart.endCut.type}(${endDev.toFixed(2)}°)`)
                                    
                                    // If first part has a straight end, flip it so straight is at position 0
                                    if (firstPart.endCut.type === 'straight' && firstPart.startCut.type === 'miter') {
                                      partFlipStates[0] = true
                                      console.log(`[FIRST-PART-OPT] Flipping first part to start with straight cut (minimize waste)`)
                                    }
                                    // Also handle case where both are miters but one is much smaller (near-straight)
                                    else if (firstPart.startCut.type === 'miter' && firstPart.endCut.type === 'miter') {
                                      // ONLY flip if one end is nearly straight (<5°) AND the other is significantly larger
                                      // Do NOT flip if BOTH ends have significant slopes (both >= MIN_DEV_DEG)
                                      const bothSignificantSlopes = startDev >= MIN_DEV_DEG && endDev >= MIN_DEV_DEG
                                      
                                      console.log(`[FIRST-PART-OPT] Both miters check: startDev=${startDev.toFixed(2)}, endDev=${endDev.toFixed(2)}, bothSignificant=${bothSignificantSlopes}, MIN_DEV_DEG=${MIN_DEV_DEG}`)
                                      
                                      if (bothSignificantSlopes) {
                                        console.log(`[FIRST-PART-OPT] NOT flipping - both ends have significant slopes (${startDev.toFixed(2)}° and ${endDev.toFixed(2)}°)`)
                                      } else if (endDev < startDev && endDev < 5.0) {
                                        // Only flip if end is nearly straight
                                        partFlipStates[0] = true
                                        console.log(`[FIRST-PART-OPT] Flipping first part to start with straighter end (${endDev.toFixed(2)}° vs ${startDev.toFixed(2)}°)`)
                                      }
                                    }
                                    // Also handle case where end is marked as straight but start is miter with near-zero deviation
                                    else if (firstPart.endCut.type === 'miter' && endDev < 1.0 && firstPart.startCut.type === 'miter' && startDev > 5.0) {
                                      partFlipStates[0] = true
                                      console.log(`[FIRST-PART-OPT] Flipping first part: end is nearly straight (${endDev.toFixed(2)}°), start is angled (${startDev.toFixed(2)}°)`)
                                    }
                                    
                                    console.log(`[FIRST-PART-OPT] First part flip decision: partFlipStates[0]=${partFlipStates[0]}`)
                                  }
                                }
                                
                                // Helper to check if two cuts can share a boundary
                                const cutsCanShare = (cut1: PartEnd, cut2: PartEnd): boolean => {
                                  if (cut1.type !== cut2.type) {
                                    // One straight, one miter - can share if miter is very small
                                    const dev1 = cut1.deviation || 0
                                    const dev2 = cut2.deviation || 0
                                    return (dev1 < 1.0 && dev2 < 1.0)
                                  }
                                  
                                  if (cut1.type === 'straight' && cut2.type === 'straight') {
                                    return true
                                  }
                                  
                                  if (cut1.type === 'miter' && cut2.type === 'miter') {
                                    // Both miters - check if angles match
                                    const dev1 = cut1.deviation || 0
                                    const dev2 = cut2.deviation || 0
                                    const devDiff = Math.abs(dev1 - dev2)
                                    return devDiff <= ANGLE_MATCH_TOL
                                  }
                                  
                                  return false
                                }
                                
                                // Special case: Handle boundary between first (index 0) and second part (index 1) FIRST
                                // This must run BEFORE the main loop to ensure Part 1 is correctly oriented
                                // Only flip the SECOND part if needed, never the first (to preserve waste minimization)
                                if (numParts >= 2) {
                                  const leftIdx = 0
                                  const rightIdx = 1
                                  const leftName = getPartNameForIdx(leftIdx)
                                  const rightName = getPartNameForIdx(rightIdx)
                                  
                                  const leftPart = partPositions[leftIdx].part
                                  const rightPart = partPositions[rightIdx].part
                                  const leftIsComp = (leftPart as any).slope_info?.complementary_pair === true
                                  const rightIsComp = (rightPart as any).slope_info?.complementary_pair === true
                                  const isComplementaryPair = leftIsComp && rightIsComp
                                  
                                  console.log(`[SPECIAL-0-1] Checking boundary 0-1: leftName=${leftName} rightName=${rightName} isComp=${isComplementaryPair} sameName=${leftName === rightName}`)
                                  
                                  // Only process if they're complementary pairs OR same-named parts
                                  if (isComplementaryPair || leftName === rightName) {
                                    const leftEnds = finalPartEnds[leftIdx]
                                    const rightEnds = finalPartEnds[rightIdx]
                                    
                                    if (leftEnds && rightEnds) {
                                      const leftFlipped = partFlipStates[leftIdx]
                                      const rightFlipped = partFlipStates[rightIdx]
                                      
                                      const leftEndCut = (leftFlipped ? leftEnds.startCut : leftEnds.endCut) as PartEnd
                                      const rightStartCut = (rightFlipped ? rightEnds.endCut : rightEnds.startCut) as PartEnd
                                      
                                      console.log(`[SPECIAL-0-1] Part 0 end: ${leftEndCut.type}(${(leftEndCut.deviation||0).toFixed(2)}) flipped=${leftFlipped}, Part 1 start: ${rightStartCut.type}(${(rightStartCut.deviation||0).toFixed(2)}) flipped=${rightFlipped}`)
                                      
                                      const currentlyShared = cutsCanShare(leftEndCut, rightStartCut)
                                      console.log(`[SPECIAL-0-1] Currently shared: ${currentlyShared}`)
                                      
                                      if (!currentlyShared) {
                                        // Try flipping ONLY the right part (index 1), never the first
                                        const rightStartCutFlipped = (!rightFlipped ? rightEnds.endCut : rightEnds.startCut) as PartEnd
                                        console.log(`[SPECIAL-0-1] If Part 1 flipped, start would be: ${rightStartCutFlipped.type}(${(rightStartCutFlipped.deviation||0).toFixed(2)})`)
                                        const wouldShareIfFlipped = cutsCanShare(leftEndCut, rightStartCutFlipped)
                                        console.log(`[SPECIAL-0-1] Would share if flipped: ${wouldShareIfFlipped}`)
                                        
                                        if (wouldShareIfFlipped) {
                                          partFlipStates[rightIdx] = !partFlipStates[rightIdx]
                                          console.log(`[ORIENTATION] Flipped part ${rightIdx} to share boundary with first part (preserving first part waste optimization)`)
                                        }
                                      }
                                    }
                                  }
                                }
                                
                                // Greedy algorithm: iterate through parts and flip if needed to share boundaries
                                // IMPORTANT: Start from index 1 to preserve first part optimization for waste minimization
                                // Process pairs (1,2), (2,3), ..., (n-2,n-1) where n=numParts
                                for (let i = 1; i < numParts - 1; i++) {
                                  const leftIdx = i
                                  const rightIdx = i + 1
                                  
                                  const leftName = getPartNameForIdx(leftIdx)
                                  const rightName = getPartNameForIdx(rightIdx)
                                  
                                  const leftPart = partPositions[leftIdx].part
                                  const rightPart = partPositions[rightIdx].part
                                  
                                  // Check if both parts are marked as complementary pairs
                                  const leftIsComp = (leftPart as any).slope_info?.complementary_pair === true
                                  const rightIsComp = (rightPart as any).slope_info?.complementary_pair === true
                                  const isComplementaryPair = leftIsComp && rightIsComp
                                  
                                  // Debug: log complementary status
                                  console.log(`[FLIP-CHECK-COMP] ${leftIdx}-${rightIdx} (${leftName} vs ${rightName}): leftIsComp=${leftIsComp}, rightIsComp=${rightIsComp}, isComplementaryPair=${isComplementaryPair}, sameName=${leftName === rightName}`)
                                  
                                  // Only process if:
                                  // 1. Both are marked as complementary pairs (backend confirmed they can nest), OR
                                  // 2. They have the same name (identical parts that might be optimized)
                                  if (!isComplementaryPair && leftName !== rightName) {
                                    console.log(`[FLIP-SKIP] Skipping ${leftIdx}-${rightIdx} (${leftName} vs ${rightName}): not complementary and different parts`)
                                    continue
                                  }
                                  
                                  const leftEnds = finalPartEnds[leftIdx]
                                  const rightEnds = finalPartEnds[rightIdx]
                                  
                                  if (!leftEnds || !rightEnds) {
                                    console.log(`[FLIP-SKIP] Skipping ${leftIdx}-${rightIdx} because missing ends`)
                                    continue
                                  }
                                  
                                  // Get current orientations
                                  const leftFlipped = partFlipStates[leftIdx]
                                  const rightFlipped = partFlipStates[rightIdx]
                                  
                                  const leftEndCut = (leftFlipped ? leftEnds.startCut : leftEnds.endCut) as PartEnd
                                  const rightStartCut = (rightFlipped ? rightEnds.endCut : rightEnds.startCut) as PartEnd
                                  
                                  // Debug for pair 1-2
                                  if (leftIdx === 1 && rightIdx === 2) {
                                    console.log(`[FLIP-CHECK-1-2] Checking pair 1-2: leftName=${leftName} rightName=${rightName}`)
                                    console.log(`[FLIP-CHECK-1-2] leftFlipped=${leftFlipped} rightFlipped=${rightFlipped}`)
                                    console.log(`[FLIP-CHECK-1-2] leftEnd=${leftEndCut.type}/${leftEndCut.deviation?.toFixed(2)}, rightStart=${rightStartCut.type}/${rightStartCut.deviation?.toFixed(2)}`)
                                  }
                                  
                                  console.log(`[FLIP-CHECK] ${leftIdx}(${leftName})-${rightIdx}(${rightName}): leftEnd=${leftEndCut.type}/${leftEndCut.deviation?.toFixed(2)}, rightStart=${rightStartCut.type}/${rightStartCut.deviation?.toFixed(2)}`)
                                  
                                  // Check if they currently share a boundary
                                  const currentlyShared = cutsCanShare(leftEndCut, rightStartCut)
                                  console.log(`[FLIP-CHECK] Currently shared: ${currentlyShared}`)
                                  
                                  if (leftIdx === 1 && rightIdx === 2) {
                                    console.log(`[FLIP-CHECK-1-2] Currently shared: ${currentlyShared}`)
                                  }
                                  
                                  if (!currentlyShared) {
                                    // Try flipping the right part to see if it helps
                                    const rightStartCutFlipped = (!rightFlipped ? rightEnds.endCut : rightEnds.startCut) as PartEnd
                                    console.log(`[FLIP-CHECK] If flipped, rightStart would be: ${rightStartCutFlipped.type}/${rightStartCutFlipped.deviation?.toFixed(2)}`)
                                    const wouldShareIfFlipped = cutsCanShare(leftEndCut, rightStartCutFlipped)
                                    console.log(`[FLIP-CHECK] Would share if flipped: ${wouldShareIfFlipped}`)
                                    
                                    if (wouldShareIfFlipped) {
                                      // Flip the right part
                                      partFlipStates[rightIdx] = !partFlipStates[rightIdx]
                                      console.log(`[ORIENTATION] Flipped part ${rightIdx} (${rightName}) to share boundary with part ${leftIdx}`)
                                    } else {
                                      console.log(`[FLIP-NO-ACTION] Part ${rightIdx} (${rightName}): flipping would NOT help`)
                                    }
                                  } else {
                                    console.log(`[FLIP-NO-ACTION] Pair ${leftIdx}-${rightIdx}: already shared, no flip needed`)
                                  }
                                }
                                
                                // Apply flips to finalPartEnds
                                finalPartEnds = finalPartEnds.map((ends, idx) => {
                                  if (!ends) return ends
                                  if (!partFlipStates[idx]) return ends
                                  
                                  // Debug log for first 3 parts
                                  if (idx < 3) {
                                    const partName = getPartNameForIdx(idx)
                                    console.log(`[FLIP-APPLY] Part ${idx} (${partName}): FLIPPING - BEFORE: start=${ends.startCut.type}(${(ends.startCut.deviation || 0).toFixed(2)}) end=${ends.endCut.type}(${(ends.endCut.deviation || 0).toFixed(2)})`)
                                  }
                                  
                                  // Swap start and end
                                  const result = {
                                    startCut: ends.endCut,
                                    endCut: ends.startCut
                                  }
                                  
                                  if (idx < 3) {
                                    const partName = getPartNameForIdx(idx)
                                    console.log(`[FLIP-APPLY] Part ${idx} (${partName}): FLIPPING - AFTER: start=${result.startCut.type}(${(result.startCut.deviation || 0).toFixed(2)}) end=${result.endCut.type}(${(result.endCut.deviation || 0).toFixed(2)})`)
                                  }
                                  
                                  return result
                                })
                                
                                // DEBUG: Log final geometry for parts 0, 1, 2 after ALL flipping
                                for (let i = 0; i < Math.min(3, numParts); i++) {
                                  const partName = getPartNameForIdx(i)
                                  const ends = finalPartEnds[i]
                                  if (ends) {
                                    console.log(`[FINAL-GEOMETRY] Part ${i} (${partName}): start=${ends.startCut.type}(${(ends.startCut.deviation || 0).toFixed(2)}) end=${ends.endCut.type}(${(ends.endCut.deviation || 0).toFixed(2)})`)
                                  }
                                }
                                
                                // DISABLED: Global canonicalization was causing incorrect rendering across different stock bars
                                // The angles from slope_info are already correct for each part's orientation
                                // finalPartEnds = finalPartEnds.map((ends, idx) => {
                                //   if (!ends) return ends
                                //   if (ends.startCut.type !== 'miter' || ends.endCut.type !== 'miter') return ends
                                //   
                                //   const partName = getDisplayPartName(partPositions[idx]?.part)
                                //   const canonical = globalCanonicalMap.get(partName)
                                //   
                                //   // If we have canonical geometry for this part, apply it
                                //   if (canonical) {
                                //     console.log(`[CANONICAL-APPLY] Part ${idx} (${partName}): APPLYING canonical`, canonical, 'was=', { startDev: ends.startCut.deviation, endDev: ends.endCut.deviation })
                                //     return {
                                //       startCut: {
                                //         ...ends.startCut,
                                //         deviation: canonical.startDev,
                                //         angleSign: canonical.startSign
                                //       },
                                //       endCut: {
                                //         ...ends.endCut,
                                //         deviation: canonical.endDev,
                                //         angleSign: canonical.endSign
                                //       }
                                //     }
                                //   }
                                //   
                                //   return ends
                                // })
                                
                                // C) Build boundary requests correctly (using deviation-normalized ends)
                                interface SlopeRequest {
                                  partIdx: number
                                  side: 'start' | 'end'
                                  rawAngle: number | null
                                  deviation: number | null
                                  owner: 'left' | 'right'
                                }
                                
                                interface Boundary {
                                  x: number
                                  isB0: boolean
                                  isBN: boolean
                                  requests: SlopeRequest[]
                                }
                                
                                const boundaries: Boundary[] = []
                                
                                // B0: boundary at x=0 (bar start)
                                if (numParts > 0) {
                                  const requests: SlopeRequest[] = []
                                  const firstPartEnd = finalPartEnds[0]
                                  if (firstPartEnd.startCut.type === 'miter') {
                                    requests.push({
                                      partIdx: 0,
                                      side: 'start',
                                      rawAngle: firstPartEnd.startCut.rawAngle,
                                      deviation: firstPartEnd.startCut.deviation,
                                      owner: 'right'
                                    })
                                  }
                                  boundaries.push({
                                    x: 0,
                                    isB0: true,
                                    isBN: false,
                                    requests
                                  })
                                }
                                
                                // Internal boundaries Bi (1..N-1): between part i-1 and i
                                for (let i = 1; i < numParts; i++) {
                                  const leftIdx = i - 1
                                  const rightIdx = i
                                  const requests: SlopeRequest[] = []
                                  
                                  // Left part requests slope on its END only if endMiter
                                  const leftPartEnd = finalPartEnds[leftIdx]
                                  if (leftPartEnd.endCut.type === 'miter') {
                                    requests.push({
                                      partIdx: leftIdx,
                                      side: 'end',
                                      rawAngle: leftPartEnd.endCut.rawAngle,
                                      deviation: leftPartEnd.endCut.deviation,
                                      owner: 'left'
                                    })
                                  }
                                  
                                  // Right part requests slope on its START only if startMiter
                                  const rightPartEnd = finalPartEnds[rightIdx]
                                  if (rightPartEnd.startCut.type === 'miter') {
                                    requests.push({
                                      partIdx: rightIdx,
                                      side: 'start',
                                      rawAngle: rightPartEnd.startCut.rawAngle,
                                      deviation: rightPartEnd.startCut.deviation,
                                      owner: 'right'
                                    })
                                  }
                                  
                                  // Also add requests for straight ends - both parts contribute to shared straight boundaries
                                  // This ensures we can detect shared straight boundaries
                                  if (leftPartEnd.endCut.type === 'straight' && rightPartEnd.startCut.type === 'straight') {
                                    // Both straight - this is a shared boundary, but we don't need to add requests
                                    // The absence of miter requests already indicates both are straight
                                  }
                                  
                                  boundaries.push({
                                    x: partPositions[i].xStart,
                                    isB0: false,
                                    isBN: false,
                                    requests
                                  })
                                }
                                
                                // BN: boundary at bar end (before waste)
                                if (numParts > 0) {
                                  const requests: SlopeRequest[] = []
                                  const lastPartEnd = finalPartEnds[lastPartIdx]
                                  if (lastPartEnd.endCut.type === 'miter') {
                                    requests.push({
                                      partIdx: lastPartIdx,
                                      side: 'end',
                                      rawAngle: lastPartEnd.endCut.rawAngle,
                                      deviation: lastPartEnd.endCut.deviation,
                                      owner: 'left'
                                    })
                                  }
                                  boundaries.push({
                                    x: partPositions[lastPartIdx].xEnd,
                                    isB0: false,
                                    isBN: true,
                                    requests
                                  })
                                }
                                
                                // E) Resolve each boundary to exactly ONE cut line (using deviation)
                                interface ResolvedBoundary {
                                  x: number
                                  lineType: 'straight' | 'sloped'
                                  ownerSide: 'left' | 'right' | null
                                  rawAngle: number | null
                                  deviation: number | null
                                }
                                
                                const resolveBoundary = (boundary: Boundary): ResolvedBoundary => {
                                  // Use same snapping as part rectangles (Math.floor) to avoid gaps/misalignment
                                  const xSnapped = Math.floor(boundary.x)
                                  
                                  // If no requests → STRAIGHT
                                  if (boundary.requests.length === 0) {
                                    return { x: xSnapped, lineType: 'straight', ownerSide: null, rawAngle: null, deviation: null }
                                  }
                                  
                                  // If 1 request → SLOPED owned by that request
                                  if (boundary.requests.length === 1) {
                                    const req = boundary.requests[0]
                                    return { x: xSnapped, lineType: 'sloped', ownerSide: req.owner, rawAngle: req.rawAngle, deviation: req.deviation }
                                  }
                                  
                                  // If 2 requests → decide if they represent the SAME shared miter cut
                                  const [reqLeft, reqRight] = boundary.requests
                                  const devLeft = reqLeft.deviation || 0
                                  const devRight = reqRight.deviation || 0
                                  const devDiff = Math.abs(devLeft - devRight)
                                  
                                  if (devDiff <= ANGLE_MATCH_TOL) {
                                    // Treat as SHARED → draw ONE diagonal (prefer LEFT)
                                    return { x: xSnapped, lineType: 'sloped', ownerSide: 'left', rawAngle: reqLeft.rawAngle, deviation: devLeft }
                                  } else {
                                    // Choose the larger deviation (more sloped)
                                    if (devLeft > devRight) {
                                      return { x: xSnapped, lineType: 'sloped', ownerSide: 'left', rawAngle: reqLeft.rawAngle, deviation: devLeft }
                                    } else if (devRight > devLeft) {
                                      return { x: xSnapped, lineType: 'sloped', ownerSide: 'right', rawAngle: reqRight.rawAngle, deviation: devRight }
                                    } else {
                                      // Tie: prefer LEFT (deterministic)
                                      return { x: xSnapped, lineType: 'sloped', ownerSide: 'left', rawAngle: reqLeft.rawAngle, deviation: devLeft }
                                    }
                                  }
                                }
                                
                                const resolvedBoundaries = boundaries.map(resolveBoundary)
                                
                                // De-duplicate boundaries at same x (keep SLOPED over STRAIGHT)
                                const boundaryMap = new Map<number, ResolvedBoundary>()
                                resolvedBoundaries.forEach(boundary => {
                                  const existing = boundaryMap.get(boundary.x)
                                  if (!existing || (existing.lineType === 'straight' && boundary.lineType === 'sloped')) {
                                    boundaryMap.set(boundary.x, boundary)
                                  }
                                })
                                
                                // Optimize part orientations for minimum waste visualization
                                // Determine which parts should be flipped to:
                                // 1. Start with straight cut if possible
                                const DISPLAY_ANGLE_MATCH_TOL = 0.5 // Strict tolerance - only truly matching angles (56° vs 58° = NOT flush)
                                
                                // Use the same flip states that were applied to finalPartEnds
                                // This ensures boundary detection uses the correct (post-flip) orientations
                                const displayFlipStates: boolean[] = [...partFlipStates]
                                

                                // Canonicalize two-sided miter display by part name using majority order
                                const slopeOrderByName = new Map<string, { startGeEnd: number; startLtEnd: number }>()
                                partPositions.forEach(({ part }, idx) => {
                                  const ends = finalPartEnds[idx]
                                  if (!ends) return
                                  if (ends.startCut.type !== 'miter' || ends.endCut.type !== 'miter') return
                                  
                                  const partData = part?.part || {}
                                  const partName = String(
                                    partData.reference || partData.element_name || partData.product_id || `b${idx + 1}`
                                  )
                                  
                                  const startDev = ends.startCut.deviation || 0
                                  const endDev = ends.endCut.deviation || 0
                                  const counts = slopeOrderByName.get(partName) || { startGeEnd: 0, startLtEnd: 0 }
                                  if (startDev >= endDev) {
                                    counts.startGeEnd += 1
                                  } else {
                                    counts.startLtEnd += 1
                                  }
                                  slopeOrderByName.set(partName, counts)
                                })
                                
                                const getPartNameAt = (partIdx: number) => {
                                  const partData = partPositions[partIdx]?.part?.part || {}
                                  return String(
                                    partData.reference || partData.element_name || partData.product_id || `b${partIdx + 1}`
                                  )
                                }
                                
                                // Canonical ends are now already applied in finalPartEnds (using average geometry)
                                // No need for additional canonicalization here
                                
                                const nextOccurenceIdx = (partIdx: number) => {
                                  const name = getPartNameAt(partIdx)
                                  const list = orderByName.get(name)
                                  if (!list || list.length === 0) return null
                                  const pos = list.findIndex((item) => item.idx === partIdx)
                                  if (pos < 0 || pos + 1 >= list.length) return null
                                  return list[pos + 1]
                                }
                                
                                const shouldCanonicalizePart = (partIdx: number) => {
                                  if (partIdx === 0) return true
                                  return getPartNameAt(partIdx - 1) !== getPartNameAt(partIdx)
                                }
                                
                                // Since we canonicalized geometry, we don't need flip alignment anymore
                                // All instances use the same geometry from finalPartEnds
                                
                                const orientEnds = (ends: { startCut: PartEnd; endCut: PartEnd }, flip: boolean) => {
                                  if (!flip) return ends
                                  return { startCut: ends.endCut, endCut: ends.startCut }
                                }
                                
                                const getDisplayEndsForPart = (partIdx: number, useCanonical: boolean) => {
                                  // finalPartEnds already contains canonical geometry - just return it
                                  return finalPartEnds[partIdx] || null
                                }
                                
                                // DEBUG: Log slope info for repeated part names to diagnose proportion mismatches
                                try {
                                  const nameCounts = new Map<string, number>()
                                  partPositions.forEach(({ part }, idx) => {
                                    const partData = part?.part || {}
                                    const partName = String(
                                      partData.reference || partData.element_name || partData.product_id || `b${idx + 1}`
                                    )
                                    nameCounts.set(partName, (nameCounts.get(partName) || 0) + 1)
                                  })
                                  
                                  partPositions.forEach(({ part }, idx) => {
                                    const partData = part?.part || {}
                                    const partName = String(
                                      partData.reference || partData.element_name || partData.product_id || `b${idx + 1}`
                                    )
                                    
                                    if ((nameCounts.get(partName) || 0) < 2) return
                                    
                                    const ends = finalPartEnds[idx]
                                    if (!ends) return
                                    
                                    const isFlipped = displayFlipStates[idx]
                                    const startCut = isFlipped ? ends.endCut : ends.startCut
                                    const endCut = isFlipped ? ends.startCut : ends.endCut
                                    
                                    console.log('[SVG-PART-DIAG]', {
                                      partName,
                                      idx,
                                      flipped: isFlipped,
                                      startType: startCut.type,
                                      startDev: startCut.deviation,
                                      startSign: startCut.angleSign,
                                      endType: endCut.type,
                                      endDev: endCut.deviation,
                                      endSign: endCut.angleSign,
                                    })
                                  })
                                } catch (e) {
                                  // Ignore debug errors
                                }
                                  
                                
                                // Compute shared boundaries FIRST (before rendering parts)
                                // This ensures we know which boundaries are shared when rendering individual markers
                                const sharedBoundarySet = new Set<number>() // Set of boundary x positions that are shared
                                const sharedMiterBoundaryMap = new Map<number, { xTop: number; xBottom: number }>()
                                
                                for (let i = 0; i < numParts - 1; i++) {
                                    const leftPartIdx = i
                                    const rightPartIdx = i + 1
                                    const leftPartEnd = finalPartEnds[leftPartIdx]
                                    const rightPartEnd = finalPartEnds[rightPartIdx]
                                    
                                    if (!leftPartEnd || !rightPartEnd) {
                                      continue
                                    }
                                    
                                    // After flipping, the geometry is swapped, so we always use endCut for left end and startCut for right start
                                    // The flip has already been applied to finalPartEnds, so just read the correct fields
                                    const leftEndType = leftPartEnd.endCut.type
                                    const rightStartType = rightPartEnd.startCut.type
                                    const leftDev = leftPartEnd.endCut.deviation || 0
                                    const rightDev = rightPartEnd.startCut.deviation || 0
                                    const leftSign = leftPartEnd.endCut.angleSign
                                    const rightSign = rightPartEnd.startCut.angleSign
                                    
                                    const boundaryX = Math.floor(partPositions[leftPartIdx].xEnd)
                                    const NEAR_STRAIGHT_THRESHOLD_FOR_SHARING = 1.0
                                    
                                    const leftPartName = partPositions[leftPartIdx]?.part?.part?.reference || `b${leftPartIdx + 1}`
                                    const rightPartName = partPositions[rightPartIdx]?.part?.part?.reference || `b${rightPartIdx + 1}`
                                    
                                    // Check if this is a complementary pair - BOTH parts must be flagged
                                    const leftPart = partPositions[leftPartIdx]?.part
                                    const rightPart = partPositions[rightPartIdx]?.part
                                    const isComplementaryPair = 
                                      (leftPart as any)?.slope_info?.complementary_pair === true &&
                                      (rightPart as any)?.slope_info?.complementary_pair === true
                                    
                                    // Debug log for boundary detection
                                    if (leftPartName === rightPartName && i <= 2) {
                                      console.log(`[BOUNDARY-DETECT] ${leftPartName} (${i} to ${i+1}): leftEndType=${leftEndType} rightStartType=${rightStartType} leftDev=${leftDev.toFixed(2)} rightDev=${rightDev.toFixed(2)} leftSign=${leftSign} rightSign=${rightSign}`)
                                    }
                                    
                                    let isShared = false
                                    if (leftEndType === 'straight' && rightStartType === 'straight') {
                                      // Both sides straight - share the boundary
                                      isShared = true
                                    } else if (leftEndType === 'miter' && rightStartType === 'miter') {
                                      const devDiff = Math.abs(leftDev - rightDev)
                                      // Check if signs match (both positive or both negative)
                                      const signsMatch = leftSign === rightSign
                                      
                                      // Both sides miter - share if:
                                      // 1. BOTH are complementary pairs AND angles match (for different parts)
                                      // 2. OR same part name AND angles match AND signs match (for identical parts)
                                      const isSamePartName = leftPartName === rightPartName
                                      isShared = (isComplementaryPair || isSamePartName) && (devDiff <= DISPLAY_ANGLE_MATCH_TOL) && signsMatch
                                      
                                      // Debug log for identical parts
                                      if (isSamePartName) {
                                        console.log(`[IDENTICAL-PARTS] ${leftPartName} (${i} to ${i+1}): leftDev=${leftDev.toFixed(2)} rightDev=${rightDev.toFixed(2)} devDiff=${devDiff.toFixed(2)} leftSign=${leftSign} rightSign=${rightSign} signsMatch=${signsMatch} isShared=${isShared}`)
                                      }
                                    } else {
                                      // Mixed type (miter-straight) - DON'T share, show individual markers
                                      // These parts can't actually be nested together
                                      isShared = false
                                    }
                                    
                                    if (isShared) {
                                      sharedBoundarySet.add(boundaryX)
                                      
                                      // Track shared boundaries with slopes so both parts render the same line
                                      const leftIsMiter = leftEndType === 'miter' && leftDev > 0
                                      const rightIsMiter = rightStartType === 'miter' && rightDev > 0
                                      
                                      // Handle any boundary where at least one side has a miter (slope)
                                      if (leftIsMiter || rightIsMiter) {
                                        let ownerSide: 'left' | 'right'
                                        let ownerDev: number
                                        let ownerSign: number
                                        let ownerPartWidth: number
                                        
                                      if (leftIsMiter && rightIsMiter) {
                                          // Both sides are miters - use left side as owner
                                          ownerSide = 'left'
                                          ownerDev = leftDev
                                          ownerSign = leftSign
                                          ownerPartWidth = Math.floor(partPositions[leftPartIdx].xEnd - partPositions[leftPartIdx].xStart)
                                        } else if (leftIsMiter) {
                                          // Only left side is miter - use left side as owner
                                          ownerSide = 'left'
                                          ownerDev = leftDev
                                          ownerSign = leftSign
                                          ownerPartWidth = Math.floor(partPositions[leftPartIdx].xEnd - partPositions[leftPartIdx].xStart)
                                        } else {
                                          // Only right side is miter - use right side as owner
                                          ownerSide = 'right'
                                          ownerDev = rightDev
                                          ownerSign = rightSign
                                          ownerPartWidth = Math.floor(partPositions[rightPartIdx].xEnd - partPositions[rightPartIdx].xStart)
                                        }
                                        
                                        const offset = calcBoundaryOffset(ownerDev, ownerPartWidth)
                                        const baseX = boundaryX + 0.5
                                        
                                        // Calculate shared line coordinates based on owner's geometry
                                        const xTop = ownerSign >= 0 ? baseX - offset : baseX
                                        const xBottom = ownerSign >= 0 ? baseX : baseX - offset
                                        
                                        sharedMiterBoundaryMap.set(boundaryX, { xTop, xBottom })
                                        console.log(`[MITER-BOUNDARY-MAP] ${leftPartName}-${rightPartName}: boundaryX=${boundaryX}, xTop=${xTop.toFixed(2)}, xBottom=${xBottom.toFixed(2)}, offset=${offset.toFixed(2)}, owner=${ownerSide}`)
                                      }
                                      
                                      // Debug log for ALL boundaries
                                        try {
                                          console.log(`[SHARED-SET-ADD] ${leftPartName}-${rightPartName}: boundaryX=${boundaryX}, leftEndType=${leftEndType}, rightStartType=${rightStartType}`)
                                        } catch (e) {
                                          // Ignore
                                      }
                                    }
                                  }
                                
                                return (
                                  <g clipPath={`url(#clip-${originalProfileIdx}-${patternIdx})`}>
                                    {/* Stock bar background - white */}
                                    <rect
                                      x="0"
                                      y="0"
                                      width="1000"
                                      height="60"
                                      fill="#ffffff"
                                    />
                                    
                                    {/* Stock bar border is handled by container div border-gray-300 class */}
                                    {/* Draw each part as its own rectangle - FLUSH with pixel snapping (or with kerf gap in geometry view) */}
                                    {partPositions.map(({ part, xStart, xEnd }, partIdx) => {
                                      // Safety check: skip if part or partEndInfo is missing
                                      if (!part || !finalPartEnds[partIdx]) {
                                        return null
                                      }
                                      
                                      const partName = getDisplayPartName(part)
                                      const partEndInfo = finalPartEnds[partIdx]
                                      
                                      // Get the part number from the cutting list table mapping
                                      const partNameStr = String(partName || '')
                                      const partNumber = partNameToNumber.get(partNameStr)
                                      const displayLabel = partNumber ? String(partNumber) : partNameStr
                                      
                                      // ROBUST SOLUTION: Calculate exact boundaries to prevent gaps and overlaps
                                      
                                      // Calculate the exact boundary between parts and waste
                                      // This MUST be the same calculation used for waste start position
                                      const exactPartsEndPx = partPositions.length > 0 
                                        ? Math.floor(partPositions[lastPartIdx].xEnd)
                                        : 0
                                      
                                      // DEBUG: Log boundary calculation for first and last parts
                                      if (partIdx === 0 || partIdx === lastPartIdx) {
                                        console.log(`[NESTING_DEBUG] Part ${partIdx} (${partName}):`, {
                                          xStart_raw: xStart,
                                          xEnd_raw: xEnd,
                                          exactPartsEndPx,
                                          usedLengthMm,
                                          pxPerMm,
                                          calculatedUsedLengthPx: usedLengthMm * pxPerMm
                                        })
                                      }
                                      
                                      // Calculate pixel positions
                                      // Use the raw positions from backend, rounding to integers
                                      const xPx = Math.floor(xStart)
                                      
                                      // Calculate end position
                                      // CRITICAL: For last part, use the exact boundary (same as waste start)
                                      // For other parts: use calculated end position
                                      let endPx: number
                                      if (partIdx === lastPartIdx && pattern.waste > 0) {
                                        // Use the exact boundary - this MUST match waste start calculation
                                        endPx = exactPartsEndPx
                                        console.log(`[NESTING_DEBUG] Last part ${partIdx} (${partName}):`, {
                                          xPx,
                                          xEnd_raw: xEnd,
                                          exactPartsEndPx,
                                          endPx,
                                          waste: pattern.waste
                                        })
                                      } else {
                                        endPx = Math.floor(xEnd)
                                      }
                                      
                                      // Calculate width as integer pixels
                                      let wPx = endPx - xPx
                                      
                                      // CRITICAL: For last part, strictly enforce the boundary
                                      // The width MUST NOT exceed the exact boundary
                                      if (partIdx === lastPartIdx && pattern.waste > 0) {
                                        // Calculate the maximum allowed width - use exact boundary
                                        const maxAllowedWidth = exactPartsEndPx - xPx
                                        // STRICT: Use the exact boundary width, not the calculated wPx
                                        // This ensures the part cannot extend beyond the boundary
                                        wPx = Math.floor(maxAllowedWidth)
                                        console.log(`[NESTING_DEBUG] Last part width enforcement:`, {
                                          calculatedWPx: endPx - xPx,
                                          maxAllowedWidth,
                                          finalWPx: wPx,
                                          xPx,
                                          endPx,
                                          exactPartsEndPx,
                                          partWillEndAt: xPx + wPx,
                                          shouldMatchWasteStart: exactPartsEndPx,
                                          clipPathWidth: exactPartsEndPx - xPx
                                        })
                                      } else {
                                        // For other parts, just ensure integer
                                        wPx = Math.floor(wPx)
                                      }
                                      
                                      // Ensure minimum width of 1px
                                      wPx = Math.max(1, wPx)
                                      
                                      // DEBUG: Log first and last part final positions
                                      if (partIdx === 0) {
                                        const partLength = part?.length || 0
                                        const expectedWidthPx = partLength * pxPerMm
                                        const partLengthFromPositions = xEnd - xStart
                                        console.log(`[NESTING_DEBUG] First part ${partIdx} (${partName}) FINAL:`, {
                                          xPx,
                                          endPx,
                                          wPx,
                                          xStart_raw: xStart,
                                          xEnd_raw: xEnd,
                                          partEndsAt: xPx + wPx,
                                          partLength,
                                          partLengthFromPositions,
                                          expectedWidthPx,
                                          pxPerMm,
                                          widthMismatch: Math.abs(wPx - expectedWidthPx) > 1
                                        })
                                      }
                                      if (partIdx === lastPartIdx) {
                                        console.log(`[NESTING_DEBUG] Last part ${partIdx} (${partName}) FINAL:`, {
                                          xPx,
                                          endPx,
                                          wPx,
                                          exactPartsEndPx,
                                          partEndsAt: xPx + wPx,
                                          shouldMatchWasteStart: exactPartsEndPx
                                        })
                                      }
                                      
                                      // Check if this part's boundaries are shared using the precomputed set
                                      let startIsShared = false
                                      let endIsShared = false
                                      
                                      // Debug log for ALL parts
                                      const shouldDebugPart = true
                                      
                                      // Check start boundary (shared with previous part)
                                      if (partIdx > 0) {
                                        const boundaryX = Math.floor(partPositions[partIdx - 1].xEnd)
                                        startIsShared = sharedBoundarySet.has(boundaryX)
                                      }
                                      
                                      // Check end boundary (shared with next part)
                                      if (partIdx < numParts - 1) {
                                        const boundaryX = Math.floor(partPositions[partIdx].xEnd)
                                        endIsShared = sharedBoundarySet.has(boundaryX)
                                      } else if (partIdx === lastPartIdx && pattern.waste > 0) {
                                        // Last part with waste - always show end boundary (it's not shared with another part)
                                        endIsShared = false
                                      }
                                      
                                      // Debug log for b34, b37, b38
                                      if (shouldDebugPart) {
                                        try {
                                          // Use SAME calculation as the actual boundary check (Math.floor of previous part's xEnd)
                                          const startBoundaryX = partIdx > 0 ? Math.floor(partPositions[partIdx - 1].xEnd) : null
                                          const endBoundaryX = partIdx < numParts - 1 ? Math.floor(partPositions[partIdx].xEnd) : null
                                          const startInSet = startBoundaryX !== null ? sharedBoundarySet.has(startBoundaryX) : null
                                          const endInSet = endBoundaryX !== null ? sharedBoundarySet.has(endBoundaryX) : null
                                          
                                          console.log(`[PART-MARKERS] ${partName}: startBoundaryX=${startBoundaryX} startInSet=${startInSet} startIsShared=${startIsShared} willShowStart=${!startIsShared} | endBoundaryX=${endBoundaryX} endInSet=${endInSet} endIsShared=${endIsShared} willShowEnd=${!endIsShared}`)
                                        } catch (e) {
                                          // Ignore
                                        }
                                      }
                                      
                                      // Hide label if rectangle too small (min width threshold)
                                      const minLabelWidth = 30
                                      const showLabel = wPx >= minLabelWidth
                                      
                                      // Only create clip path for the last part to prevent overflow into waste
                                      const isLastPart = partIdx === lastPartIdx && pattern.waste > 0
                                      const partClipId = isLastPart ? `part-clip-${originalProfileIdx}-${patternIdx}-${partIdx}` : null
                                      
                                      return (
                                        <g key={partIdx}>
                                          {/* Define clip path ONLY for last part */}
                                          {isLastPart && (
                                          <defs>
                                              <clipPath id={partClipId!}>
                                                {/* For last part, use exact boundary to prevent ANY overflow into waste */}
                                                {/* CRITICAL: Use exact boundary calculation directly, not wPx, to ensure strict clipping */}
                                          <rect
                                            x={xPx}
                                            y="0"
                                                  width={exactPartsEndPx - xPx + 1}  // Add 1px to ensure polygon fills completely
                                            height={barHeight}
                                                />
                                              </clipPath>
                                            </defs>
                                          )}
                                          
                                          {/* Part shape matching actual cut geometry - polygon with angled ends */}
                                          {/* All coordinates are already integers, ensuring pixel-perfect rendering */}
                                          {/* CRITICAL: Only use clipPath for last part to prevent overflow */}
                                          {/* Calculate polygon boundaries once and reuse for both polygon and markers */}
                                          {(() => {
                                            // Use canonical geometry directly - no flipping
                                            const displayEnds = getDisplayEndsForPart(partIdx, shouldCanonicalizePart(partIdx)) || partEndInfo
                                            const startType = displayEnds.startCut.type
                                            const endType = displayEnds.endCut.type
                                            const startDev = displayEnds.startCut.deviation || 0
                                            const endDev = displayEnds.endCut.deviation || 0
                                            const startSign = displayEnds.startCut.angleSign
                                            const endSign = displayEnds.endCut.angleSign
                                            
                                            // Use same constants as marker lines
                                            const markerInset = 8
                                            
                                            // CRITICAL: The marker lines show the correct boundaries (vertical lines at cut positions)
                                            // The polygon must be clipped to these vertical marker line positions
                                            // For sloped parts, the polygon should NOT extend beyond the vertical marker lines
                                            
                                            // Calculate the vertical marker line positions (where the actual cuts are)
                                            // These are the boundaries that the polygon must respect
                                            let markerLeftX: number
                                            let markerRightX: number
                                            
                                            // Start boundary (left side) - get the vertical marker line position
                                            if (partIdx === 0) {
                                              // First part: marker is at x=0
                                              markerLeftX = xPx
                                            } else if (startIsShared) {
                                              // Shared boundary: marker is at the boundary position
                                              markerLeftX = xPx
                                            } else {
                                              // Non-shared boundary: marker is at xPx + markerInset for straight, or at the vertical position for miter
                                              // For miter cuts, the marker line is still vertical at the boundary position
                                              // The diagonal line shows the slope, but the boundary is vertical
                                              markerLeftX = startType === 'straight' ? xPx + markerInset : xPx
                                            }
                                            
                                            // End boundary (right side) - get the vertical marker line position
                                            if (partIdx === lastPartIdx && pattern.waste > 0) {
                                              // Last part: marker is at exactPartsEndPx
                                              markerRightX = exactPartsEndPx
                                            } else if (partIdx === lastPartIdx && pattern.waste === 0) {
                                              // Last part with 0 waste: marker is at end of stockbar
                                              markerRightX = 1000
                                            } else if (endIsShared) {
                                              // Shared boundary: marker is at the boundary position
                                              markerRightX = endPx
                                            } else {
                                              // Non-shared boundary: marker is at endPx - markerInset for straight, or at the vertical position for miter
                                              markerRightX = endType === 'straight' ? endPx - markerInset : endPx
                                            }
                                            
                                            // Polygon fills the part width from xPx to endPx
                                            // Each part gets its natural width, no stretching
                                            const polyLeftX = xPx + 0.5
                                            const polyRightX = endPx + 0.5
                                            
                                            // Create polygon from this part's own geometry (consistent per part number)
                                            let points: string
                                            
                                            // CRITICAL FIX: Only show slopes when they're ACTUALLY part of a complementary pair
                                            // Don't show slopes just because the part has a miter cut - only show if it's being shared
                                            let hasSlopedStart: boolean
                                            let hasSlopedEnd: boolean
                                            
                                            // Check if this part is in a complementary pair
                                            const currentPartData = partPositions[partIdx]?.part
                                            const isInComplementaryPair = (currentPartData as any)?.slope_info?.complementary_pair === true
                                            
                                            // Check if adjacent parts share complementary cuts
                                            const leftPartIdx = partIdx - 1
                                            const rightPartIdx = partIdx + 1
                                            
                                            let leftIsComplementary = false
                                            let rightIsComplementary = false
                                            
                                            if (leftPartIdx >= 0) {
                                              const leftPartData = partPositions[leftPartIdx]?.part
                                              const leftPartEnd = getDisplayEndsForPart(leftPartIdx, shouldCanonicalizePart(leftPartIdx))
                                              const leftEndType = leftPartEnd.endCut.type
                                              const leftDev = leftPartEnd.endCut.deviation
                                              const leftPartName = leftPartData?.part?.reference || leftPartData?.part?.element_name || `b${leftPartIdx + 1}`
                                              
                                              // Check if left boundary is a shared sloped cut
                                              // This includes: complementary pairs OR identical parts with matching slopes
                                              if (startType === 'miter' && leftEndType === 'miter' && startDev !== null && leftDev !== null) {
                                                const devDiff = Math.abs(startDev - leftDev)
                                                const isLeftCompPair = (leftPartData as any)?.slope_info?.complementary_pair === true
                                                const isSamePart = leftPartName === partName
                                                const leftSign = leftPartEnd.endCut.angleSign
                                                const signsMatch = startSign === leftSign
                                                leftIsComplementary = ((isInComplementaryPair && isLeftCompPair) || isSamePart) && devDiff <= 0.5 && signsMatch
                                                
                                                // Debug for part 2
                                                if (partIdx === 2) {
                                                  console.log(`[LEFT-CHECK] Part ${partIdx} (${partName}) vs Part ${leftPartIdx} (${leftPartName}): startType=${startType} leftEndType=${leftEndType} startDev=${startDev?.toFixed(2)} leftDev=${leftDev?.toFixed(2)} devDiff=${devDiff.toFixed(2)} startSign=${startSign} leftSign=${leftSign} signsMatch=${signsMatch} isSamePart=${isSamePart} isLeftCompPair=${isLeftCompPair} isInComplementaryPair=${isInComplementaryPair} → leftIsComplementary=${leftIsComplementary}`)
                                                }
                                              } else if (partIdx === 2) {
                                                console.log(`[LEFT-CHECK] Part ${partIdx} (${partName}) vs Part ${leftPartIdx} (${leftPartName}): startType=${startType} leftEndType=${leftEndType} startDev=${startDev?.toFixed(2)} leftDev=${leftDev?.toFixed(2)} → NOT both miters, skipping`)
                                              }
                                            }
                                            
                                            if (rightPartIdx < numParts) {
                                              const rightPartData = partPositions[rightPartIdx]?.part
                                              const rightPartEnd = getDisplayEndsForPart(rightPartIdx, shouldCanonicalizePart(rightPartIdx))
                                              const rightStartType = rightPartEnd.startCut.type
                                              const rightDev = rightPartEnd.startCut.deviation
                                              const rightPartName = rightPartData?.part?.reference || rightPartData?.part?.element_name || `b${rightPartIdx + 1}`
                                              
                                              // Check if right boundary is a shared sloped cut
                                              // This includes: complementary pairs OR identical parts with matching slopes
                                              if (endType === 'miter' && rightStartType === 'miter' && endDev !== null && rightDev !== null) {
                                                const devDiff = Math.abs(endDev - rightDev)
                                                const isRightCompPair = (rightPartData as any)?.slope_info?.complementary_pair === true
                                                const isSamePart = rightPartName === partName
                                                rightIsComplementary = ((isInComplementaryPair && isRightCompPair) || isSamePart) && devDiff <= 0.5
                                              }
                                            }
                                            
                                            // Show slope at start if:
                                            // 1. It's a complementary boundary with the left part, OR
                                            // 2. It's the first part and has a miter cut, OR
                                            // 3. It has a miter cut and is NOT complementary (show the actual geometry)
                                            const bothSignificantMiters = startType === 'miter' && endType === 'miter' && startDev >= 1.0 && endDev >= 1.0
                                            hasSlopedStart = leftIsComplementary || 
                                                            (partIdx === 0 && startType === 'miter' && startDev >= 1.0) ||
                                                            (!leftIsComplementary && startType === 'miter' && startDev >= 1.0)
                                            
                                            // Show slope at end if:
                                            // 1. It's a complementary boundary with the right part, OR
                                            // 2. It's the last part with waste and has a miter, OR
                                            // 3. It has a miter cut and is NOT complementary (show the actual geometry)
                                            hasSlopedEnd = rightIsComplementary || 
                                                          (partIdx === lastPartIdx && pattern.waste > 0 && endType === 'miter' && endDev > 0) ||
                                                          (!rightIsComplementary && endType === 'miter' && endDev >= 1.0)
                                            
                                            // Debug logging for parts 1 and 2
                                            if (partIdx === 1 || partIdx === 2) {
                                              console.log(`[SLOPE-RENDER] Part ${partIdx} (${partName}): startType=${startType} endType=${endType} leftIsComp=${leftIsComplementary} rightIsComp=${rightIsComplementary} hasSlopedStart=${hasSlopedStart} hasSlopedEnd=${hasSlopedEnd}`)
                                            }
                                            
                                            const actualRightX = (partIdx === lastPartIdx && pattern.waste > 0 && hasSlopedEnd)
                                              ? exactPartsEndPx + 0.5
                                              : polyRightX
                                            
                                            const startOffset = hasSlopedStart ? calcBoundaryOffset(startDev, wPx) : 0
                                            const endOffset = hasSlopedEnd ? calcBoundaryOffset(endDev, wPx) : 0
                                            
                                            // Debug offset calculation for first few parts
                                            if (partIdx <= 1) {
                                              console.log(`[OFFSET-CALC] Part ${partIdx} (${partName}):`, {
                                                startDev,
                                                endDev,
                                                barHeight,
                                                wPx,
                                                startOffsetRaw: startDev ? Math.tan(degToRad(startDev)) * (barHeight - 1) : 0,
                                                endOffsetRaw: endDev ? Math.tan(degToRad(endDev)) * (barHeight - 1) : 0,
                                                maxAllowedStart: wPx * 0.45,
                                                maxAllowedEnd: wPx * 0.45,
                                                startOffset,
                                                endOffset
                                              })
                                            }
                                            
                                            const clampX = (x: number) => Math.max(0, Math.min(1000, x))
                                            
                                            // Calculate left edge points
                                            let topLeftX: number
                                            let bottomLeftX: number
                                            if (hasSlopedStart) {
                                              // Apply miter offset based on sign
                                              topLeftX = clampX(startSign >= 0 ? polyLeftX : polyLeftX + startOffset)
                                              bottomLeftX = clampX(startSign >= 0 ? polyLeftX + startOffset : polyLeftX)
                                            } else {
                                              // Straight edge - no offset
                                              topLeftX = clampX(polyLeftX)
                                              bottomLeftX = clampX(polyLeftX)
                                            }
                                            
                                            // Calculate right edge points
                                            let topRightX: number
                                            let bottomRightX: number
                                            if (hasSlopedEnd) {
                                              // Apply miter offset based on sign
                                              topRightX = clampX(endSign >= 0 ? actualRightX - endOffset : actualRightX)
                                              bottomRightX = clampX(endSign >= 0 ? actualRightX : actualRightX - endOffset)
                                            } else {
                                              // Straight edge - no offset
                                              topRightX = clampX(actualRightX)
                                              bottomRightX = clampX(actualRightX)
                                            }
                                            
                                            // Shared boundary lookup for complementary miters - no visual gap
                                            // Parts render flush against each other to preserve accurate waste area
                                            
                                            if (startIsShared && startType === 'miter' && partIdx > 0) {
                                              const boundaryX = Math.floor(partPositions[partIdx - 1].xEnd)
                                              const sharedLine = sharedMiterBoundaryMap.get(boundaryX)
                                              if (sharedLine) {
                                                console.log(`[MITER-LOOKUP-START] Part ${partIdx} (${partName}): boundaryX=${boundaryX}, found sharedLine xTop=${sharedLine.xTop.toFixed(2)} xBottom=${sharedLine.xBottom.toFixed(2)}`)
                                                // Use exact boundary without offset
                                                topLeftX = clampX(sharedLine.xTop)
                                                bottomLeftX = clampX(sharedLine.xBottom)
                                              } else {
                                                console.log(`[MITER-LOOKUP-START] Part ${partIdx} (${partName}): boundaryX=${boundaryX}, NO sharedLine found`)
                                              }
                                            }
                                            
                                            if (endIsShared && endType === 'miter' && partIdx < numParts - 1) {
                                              const boundaryX = Math.floor(partPositions[partIdx].xEnd)
                                              const sharedLine = sharedMiterBoundaryMap.get(boundaryX)
                                              if (sharedLine) {
                                                console.log(`[MITER-LOOKUP-END] Part ${partIdx} (${partName}): boundaryX=${boundaryX}, found sharedLine xTop=${sharedLine.xTop.toFixed(2)} xBottom=${sharedLine.xBottom.toFixed(2)}`)
                                                // Use exact boundary without offset
                                                topRightX = clampX(sharedLine.xTop)
                                                bottomRightX = clampX(sharedLine.xBottom)
                                              } else {
                                                console.log(`[MITER-LOOKUP-END] Part ${partIdx} (${partName}): boundaryX=${boundaryX}, NO sharedLine found`)
                                              }
                                            }
                                            
                                            // Debug logging for polygon calculation
                                            if (partIdx === 0 || partIdx === 1) {
                                              console.log(`[POLYGON-WIDTH] Part ${partIdx} (${partName}): polyLeft=${polyLeftX.toFixed(2)} polyRight=${polyRightX.toFixed(2)} visualWidth=${(polyRightX - polyLeftX).toFixed(2)} xPx=${xPx} endPx=${endPx} wPx=${wPx}`)
                                              console.log(`[POLYGON-OFFSET] Part ${partIdx} (${partName}): startOffset=${startOffset.toFixed(2)} endOffset=${endOffset.toFixed(2)} startDev=${startDev.toFixed(2)} endDev=${endDev.toFixed(2)}`)
                                              console.log(`[POLYGON-SLOPED] Part ${partIdx} (${partName}): hasSlopedStart=${hasSlopedStart} hasSlopedEnd=${hasSlopedEnd} startIsShared=${startIsShared} endIsShared=${endIsShared} startSign=${startSign} endSign=${endSign}`)
                                              console.log(`[POLYGON-POINTS-FINAL] Part ${partIdx} (${partName}): topLeft=${topLeftX.toFixed(2)} bottomLeft=${bottomLeftX.toFixed(2)} topRight=${topRightX.toFixed(2)} bottomRight=${bottomRightX.toFixed(2)}`)
                                            }
                                            
                                            points = `${topLeftX},0.5 ${topRightX},0.5 ${bottomRightX},${barHeight - 0.5} ${bottomLeftX},${barHeight - 0.5}`
                                            
                                            const startMarkerOffset = startType === 'miter' ? calcBoundaryOffset(startDev, wPx) : 0
                                            const endMarkerOffset = endType === 'miter' ? calcBoundaryOffset(endDev, wPx) : 0
                                            
                                            const startMarkerTopX = startSign >= 0 ? polyLeftX : polyLeftX + startMarkerOffset
                                            const startMarkerBottomX = startSign >= 0 ? polyLeftX + startMarkerOffset : polyLeftX
                                            const endMarkerTopX = endSign >= 0 ? polyRightX - endMarkerOffset : polyRightX
                                            const endMarkerBottomX = endSign >= 0 ? polyRightX : polyRightX - endMarkerOffset
                                            
                                            // Calculate center X for part label - use actual polygon boundaries
                                            // Center between left and right (the actual visible boundaries)
                                            const centerX = (polyLeftX + polyRightX) / 2
                                            
                                            return (
                                              <>
                                                {/* Polygon drawn WITHOUT clip path to preserve complete borders */}
                                                {/* The polygon coordinates are already constrained to not extend into waste */}
                                                <polygon
                                                  points={points}
                                                  fill="rgba(156, 163, 175, 0.1)"
                                                  stroke="#9ca3af"
                                                  strokeWidth="1"
                                                  strokeLinejoin="miter"
                                                  shapeRendering="crispEdges"
                                                  style={{ cursor: 'pointer' }}
                                                  onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    setTooltip({
                                                      visible: true,
                                                      x: rect.left + rect.width / 2,
                                                      y: rect.top - 10,
                                                      profileName: profile.profile_name,
                                                      partName: partName,
                                                      length: part?.length || 0,
                                                      startAngle: partEndInfo?.startCut?.type === 'miter' && partEndInfo.startCut.rawAngle !== null ? (partEndInfo.startCut.rawAngle.toFixed(1) + '°') : '0°',
                                                      endAngle: partEndInfo?.endCut?.type === 'miter' && partEndInfo.endCut.rawAngle !== null ? (partEndInfo.endCut.rawAngle.toFixed(1) + '°') : '0°'
                                                    })
                                                  }}
                                                  onMouseMove={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    setTooltip(prev => prev ? {
                                                      ...prev,
                                                      x: rect.left + rect.width / 2,
                                                      y: rect.top - 10
                                                    } : null)
                                                  }}
                                                  onMouseLeave={() => {
                                                    setTooltip(null)
                                                  }}
                                                />

                                                
                                                {/* Per-part end markers - vertical lines at the boundary positions */}
                                                {/* Only show markers for non-shared boundaries */}
                                                {/* Shared boundaries will be drawn separately after all parts */}
                                                {/* Marker lines are vertical for straight cuts, diagonal for miter cuts */}
                                                <g clipPath={isLastPart ? `url(#${partClipId!})` : undefined}>
                                                  {/* Start cut marker - only if NOT shared AND NOT first part (first part start is stock bar edge) */}
                                                  {/* ONLY show for straight cuts - sloped non-shared boundaries don't need markers */}
                                                  {!startIsShared && partIdx > 0 && startType === 'straight' && (
                                                        <line
                                                          x1={polyLeftX}
                                                          y1="0.5"
                                                          x2={polyLeftX}
                                                          y2={barHeight - 0.5}
                                                          stroke="#9ca3af"
                                                          strokeWidth="1"
                                                          strokeLinecap="butt"
                                                          shapeRendering="crispEdges"
                                                        />
                                                  )}
                                                  
                                                  {/* End cut marker - for non-last parts or last part with waste */}
                                                  {(() => {
                                                    const isLastPartWithWaste = partIdx === lastPartIdx && pattern.waste > 0
                                                    const shouldShowMarker = !endIsShared || isLastPartWithWaste
                                                    
                                                    if (!shouldShowMarker) return null
                                                    
                                                    // For last part with straight cut, don't draw here (will be drawn outside clipPath)
                                                    if (isLastPartWithWaste && endType === 'straight') {
                                                      return null
                                                    }
                                                    
                                                    return (
                                                      <>
                                                        {/* ONLY show for straight cuts - sloped non-shared boundaries don't need markers */}
                                                        {endType === 'straight' && (
                                                          <line
                                                            x1={polyRightX}
                                                            y1="0.5"
                                                            x2={polyRightX}
                                                            y2={barHeight - 0.5}
                                                            stroke="#9ca3af"
                                                            strokeWidth="1"
                                                            strokeLinecap="butt"
                                                            shapeRendering="crispEdges"
                                                          />
                                                        )}
                                                      </>
                                                    )
                                                  })()}
                                                </g>
                                                
                                                {/* Part labels are now rendered as absolute positioned divs outside SVG */}
                                              </>
                                            )
                                          })()}
                                          
                                          {/* End boundary line for last part - draw outside clipPath to ensure visibility */}
                                          {/* For miter cuts, draw diagonal line; for straight cuts, draw vertical line */}
                                          {isLastPart && exactPartsEndPx > 0 && (() => {
                                            // Get endType for the last part - no flipping
                                            const displayEnds = getDisplayEndsForPart(partIdx, shouldCanonicalizePart(partIdx)) || partEndInfo
                                            const endType = displayEnds.endCut.type
                                            const endDev = displayEnds.endCut.deviation || 0
                                            const endSign = displayEnds.endCut.angleSign
                                            const partWidthPx = Math.max(1, exactPartsEndPx - xPx)
                                            const endOffset = calcBoundaryOffset(endDev, partWidthPx)
                                            
                                            if (endType === 'miter') {
                                              // Sloped end boundary - draw diagonal line
                                              return (
                                                <line
                                                  key={`last-part-boundary-${partIdx}`}
                                                  x1={(endSign >= 0 ? exactPartsEndPx - endOffset : exactPartsEndPx + 0.5)}
                                                  y1="0.5"
                                                  x2={(endSign >= 0 ? exactPartsEndPx + 0.5 : exactPartsEndPx - endOffset)}
                                                  y2={barHeight - 0.5}
                                                  stroke="#9ca3af"
                                                  strokeWidth="1"
                                                  strokeLinecap="butt"
                                                  shapeRendering="crispEdges"
                                                />
                                              )
                                            } else {
                                              // Straight end boundary
                                              return (
                                                <line
                                                  key={`last-part-boundary-${partIdx}`}
                                                  x1={exactPartsEndPx + 0.5}
                                                  y1="0.5"
                                                  x2={exactPartsEndPx + 0.5}
                                                  y2={barHeight - 0.5}
                                                  stroke="#9ca3af"
                                                  strokeWidth="1"
                                                  strokeLinecap="butt"
                                                  shapeRendering="crispEdges"
                                                />
                                              )
                                            }
                                          })()}
                                        </g>
                                      )
                                    })}
                                    
                                    {/* Shared boundary markers removed to avoid double-edges */}
                                    {false && (() => {
                                      // Iterate through ALL internal boundaries between parts (not just boundaryMap)
                                      const sharedBoundaries: Array<{ x: number, leftPartIdx: number, rightPartIdx: number, leftEndType: string, rightStartType: string, leftDev: number, rightDev: number }> = []
                                      
                                      for (let i = 0; i < numParts - 1; i++) {
                                        const leftPartIdx = i
                                        const rightPartIdx = i + 1
                                        
                                        const leftPartEnd = finalPartEnds[leftPartIdx]
                                        const rightPartEnd = finalPartEnds[rightPartIdx]
                                        
                                        if (!leftPartEnd || !rightPartEnd) {
                                          continue
                                        }
                                        
                                        // Use display flip states so identical parts render the same geometry
                                        const leftEndType = displayFlipStates[leftPartIdx] ? leftPartEnd.startCut.type : leftPartEnd.endCut.type
                                        const rightStartType = displayFlipStates[rightPartIdx] ? rightPartEnd.endCut.type : rightPartEnd.startCut.type
                                        const leftDev = displayFlipStates[leftPartIdx] ? leftPartEnd.startCut.deviation || 0 : leftPartEnd.endCut.deviation || 0
                                        const rightDev = displayFlipStates[rightPartIdx] ? rightPartEnd.endCut.deviation || 0 : rightPartEnd.startCut.deviation || 0
                                        
                                        // Boundary x position is the start of the right part
                                        // CRITICAL: Use the EXACT same calculation as the part rectangles to ensure alignment
                                        // Part rectangles use: xPx = partIdx === 0 ? 0 : Math.floor(xStart)
                                        // So boundary should use the same logic
                                        const rightPartXStart = partPositions[rightPartIdx].xStart
                                        const boundaryX = rightPartIdx === 0 ? 0 : Math.floor(rightPartXStart)
                                        
                                        // Debug log for ALL boundaries involving b34, b37, b38 (before checking if shared)
                                        const leftPartName = partPositions[leftPartIdx]?.part?.part?.reference || `b${leftPartIdx + 1}`
                                        const rightPartName = partPositions[rightPartIdx]?.part?.part?.reference || `b${rightPartIdx + 1}`
                                        
                                        // Log all boundaries for debugging (only for b34, b37, b38)
                                        const shouldLog = leftPartName === 'b34' || leftPartName === 'b37' || leftPartName === 'b38' ||
                                                         rightPartName === 'b34' || rightPartName === 'b37' || rightPartName === 'b38'
                                        
                                        // Check if it's truly shared (both parts have matching types)
                                        let isShared = false
                                        
                                        // Check if shared: both parts must have matching end types
                                        // OR both are very close to straight (near-straight threshold)
                                        const NEAR_STRAIGHT_THRESHOLD_FOR_SHARING = 1.0 // More lenient for sharing detection
                                        
                                        if (leftEndType === 'straight' && rightStartType === 'straight') {
                                          // Both straight = shared straight boundary
                                          isShared = true
                                        } else if (leftEndType === 'miter' && rightStartType === 'miter') {
                                          // Both miter = check if complementary or same part geometry
                                          const devDiff = Math.abs(leftDev - rightDev)
                                          const samePart = leftPartName === rightPartName
                                          isShared = devDiff <= ANGLE_MATCH_TOL || samePart
                                        } else {
                                          // Mixed types: share the boundary and show the miter marker (the actual cut geometry)
                                          // When parts are flush, they share a physical cut, so show a single marker
                                          // Use the miter geometry since that's what will actually be cut
                                          const bothNearStraight = 
                                            (leftDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING) && 
                                            (rightDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING)
                                          
                                          if (bothNearStraight) {
                                            // Both are very close to straight = treat as shared straight boundary
                                            isShared = true
                                          } else {
                                            // One is straight, one is miter - still share the boundary
                                            // The actual cut will be the miter, so we'll draw that in the rendering
                                            isShared = true
                                          }
                                        }
                                        
                                        // Log boundary check (for debugging)
                                        if (shouldLog) {
                                          try {
                                            const minDev = Math.min(leftDev, rightDev)
                                            const maxDev = Math.max(leftDev, rightDev)
                                            const bothNearStraight = (leftDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING) && (rightDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING)
                                            const lenientCheck = minDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING && maxDev < 10.0
                                            
                                            console.log(`[BOUNDARY-CHECK] ${leftPartName}-${rightPartName}:`, {
                                              boundaryX,
                                              leftPartIdx,
                                              rightPartIdx,
                                              leftEndType,
                                              rightStartType,
                                              leftDev: leftDev.toFixed(2),
                                              rightDev: rightDev.toFixed(2),
                                              minDev: minDev.toFixed(2),
                                              maxDev: maxDev.toFixed(2),
                                              isShared,
                                              bothNearStraight,
                                              lenientCheck,
                                              devDiff: leftEndType === 'miter' && rightStartType === 'miter' ? Math.abs(leftDev - rightDev).toFixed(2) : null,
                                              ANGLE_MATCH_TOL
                                            })
                                          } catch (e) {
                                            // Ignore logging errors
                                          }
                                        }
                                        
                                        if (isShared) {
                                          sharedBoundaries.push({
                                            x: boundaryX,
                                            leftPartIdx,
                                            rightPartIdx,
                                            leftEndType,
                                            rightStartType,
                                            leftDev,
                                            rightDev
                                          })
                                        }
                                      }
                                      
                                      // Render shared boundary markers
                                      return sharedBoundaries.map((sb, idx) => {
                                        const xSnapped = sb.x
                                        
                                        // Draw shared marker at the exact boundary position (no inset, no gap)
                                        if (sb.leftEndType === 'straight' && sb.rightStartType === 'straight') {
                                          // Shared straight boundary
                                          return (
                                            <line
                                              key={`shared-boundary-${idx}`}
                                              x1={xSnapped + 0.5}
                                              y1="0.5"
                                              x2={xSnapped + 0.5}
                                              y2={barHeight - 0.5}
                                              stroke="#9ca3af"
                                              strokeWidth="1"
                                              strokeLinecap="butt"
                                              shapeRendering="crispEdges"
                                              vectorEffect="non-scaling-stroke"
                                            />
                                          )
                                        } else if (sb.leftEndType === 'miter' && sb.rightStartType === 'miter') {
                                          // Shared sloped boundary - determine direction from deviations
                                          const leftWidthPx = Math.max(
                                            1,
                                            Math.floor(partPositions[sb.leftPartIdx].xEnd) -
                                              (sb.leftPartIdx === 0 ? 0 : Math.floor(partPositions[sb.leftPartIdx].xStart))
                                          )
                                          const rightWidthPx = Math.max(
                                            1,
                                            Math.floor(partPositions[sb.rightPartIdx].xEnd) -
                                              Math.floor(partPositions[sb.rightPartIdx].xStart)
                                          )
                                          
                                          const resolvedBoundary = boundaryMap.get(xSnapped)
                                          const ownerSide = resolvedBoundary?.ownerSide || 'left'
                                          const ownerDev = ownerSide === 'left' ? sb.leftDev : sb.rightDev
                                          const ownerWidthPx = ownerSide === 'left' ? leftWidthPx : rightWidthPx
                                          const diagonalOffset = calcDiagOffset(ownerDev, ownerWidthPx)
                                          
                                          let x1, y1, x2, y2
                                          if (ownerSide === 'left') {
                                            x1 = xSnapped - diagonalOffset
                                            y1 = 0
                                            x2 = xSnapped
                                            y2 = barHeight
                                        } else {
                                            x1 = xSnapped
                                            y1 = 0
                                            x2 = xSnapped + diagonalOffset
                                            y2 = barHeight
                                          }
                                          
                                            return (
                                              <line
                                              key={`shared-boundary-${idx}`}
                                              x1={typeof x1 === 'number' ? x1 + 0.5 : x1}
                                              y1={typeof y1 === 'number' ? y1 + 0.5 : y1}
                                              x2={typeof x2 === 'number' ? x2 + 0.5 : x2}
                                              y2={typeof y2 === 'number' ? y2 + 0.5 : y2}
                                              stroke="#9ca3af"
                                              strokeWidth="1"
                                              strokeLinecap="butt"
                                              shapeRendering="crispEdges"
                                              vectorEffect="non-scaling-stroke"
                                            />
                                          )
                                        } else {
                                          // Mixed types: one straight, one miter
                                          // Show the marker based on which side has the miter (the actual cut geometry)
                                          const leftIsMiter = sb.leftEndType === 'miter' && sb.leftDev > 0
                                          const rightIsMiter = sb.rightStartType === 'miter' && sb.rightDev > 0
                                          
                                          const leftWidthPx = Math.max(
                                            1,
                                            Math.floor(partPositions[sb.leftPartIdx].xEnd) -
                                              (sb.leftPartIdx === 0 ? 0 : Math.floor(partPositions[sb.leftPartIdx].xStart))
                                          )
                                          const rightWidthPx = Math.max(
                                            1,
                                            Math.floor(partPositions[sb.rightPartIdx].xEnd) -
                                              Math.floor(partPositions[sb.rightPartIdx].xStart)
                                          )
                                          
                                          const diagonalOffset = calcDiagOffset(
                                            leftIsMiter ? sb.leftDev : sb.rightDev,
                                            leftIsMiter ? leftWidthPx : rightWidthPx
                                          )
                                          
                                          // Show sloped if either side has a significant miter
                                          // BUT: if left is straight and right is miter, show straight (unless it's the last boundary)
                                          if (leftIsMiter) {
                                            // Left end is miter - show sloped marker
                                            const resolvedBoundary = boundaryMap.get(xSnapped)
                                            const ownerSide = resolvedBoundary?.ownerSide || 'left'
                                            
                                            let x1, y1, x2, y2
                                            if (ownerSide === 'left') {
                                              x1 = xSnapped - diagonalOffset
                                              y1 = 0
                                              x2 = xSnapped
                                              y2 = barHeight
                                            } else {
                                              x1 = xSnapped
                                              y1 = 0
                                              x2 = xSnapped + diagonalOffset
                                              y2 = barHeight
                                            }
                                            
                                            return (
                                              <line
                                                key={`shared-boundary-${idx}`}
                                                x1={typeof x1 === 'number' ? x1 + 0.5 : x1}
                                                y1={typeof y1 === 'number' ? y1 + 0.5 : y1}
                                                x2={typeof x2 === 'number' ? x2 + 0.5 : x2}
                                                y2={typeof y2 === 'number' ? y2 + 0.5 : y2}
                                                stroke="#9ca3af"
                                                strokeWidth="1"
                                                strokeLinecap="butt"
                                                shapeRendering="crispEdges"
                                                vectorEffect="non-scaling-stroke"
                                              />
                                            )
                                          } else if (rightIsMiter && sb.rightPartIdx === numParts - 1) {
                                            // Right start is miter and it's the last internal boundary - show sloped
                                            const resolvedBoundary = boundaryMap.get(xSnapped)
                                            const ownerSide = resolvedBoundary?.ownerSide || 'right'
                                            
                                          let x1, y1, x2, y2
                                            if (ownerSide === 'left') {
                                            x1 = xSnapped - diagonalOffset
                                            y1 = 0
                                            x2 = xSnapped
                                            y2 = barHeight
                                          } else {
                                            x1 = xSnapped
                                            y1 = 0
                                            x2 = xSnapped + diagonalOffset
                                            y2 = barHeight
                                          }
                                          
                                          return (
                                            <line
                                                key={`shared-boundary-${idx}`}
                                                x1={typeof x1 === 'number' ? x1 + 0.5 : x1}
                                                y1={typeof y1 === 'number' ? y1 + 0.5 : y1}
                                                x2={typeof x2 === 'number' ? x2 + 0.5 : x2}
                                                y2={typeof y2 === 'number' ? y2 + 0.5 : y2}
                                                stroke="#9ca3af"
                                                strokeWidth="1"
                                                strokeLinecap="butt"
                                                shapeRendering="crispEdges"
                                              />
                                            )
                                          } else {
                                            // Show straight marker (the simpler cut for mixed boundaries)
                                            return (
                                              <line
                                                key={`shared-boundary-${idx}`}
                                                x1={Math.round(xSnapped) + 0.5}
                                                y1="0.5"
                                                x2={Math.round(xSnapped) + 0.5}
                                                y2={barHeight - 0.5}
                                                stroke="#9ca3af"
                                                strokeWidth="1"
                                                strokeLinecap="butt"
                                                shapeRendering="crispEdges"
                                              />
                                            )
                                          }
                                        }
                                      })
                                    })()}
                                    
                                    {/* Waste section - starts after last part (FLUSH), with boundary line */}
                                    {pattern.waste > 0 && !(pattern as any).exceeds_stock && partPositions.length > 0 && (() => {
                                      // CRITICAL: Use the EXACT same boundary calculation as the last part
                                      // This ensures perfect alignment - no gap, no overlap
                                      const exactPartsEndPx = Math.floor(partPositions[lastPartIdx].xEnd)
                                      
                                      const wasteWidth = (pattern.waste * pxPerMm)
                                      
                                      // Use integer pixels for waste area
                                      const wasteXPx = exactPartsEndPx
                                      const wasteWPx = Math.floor(wasteWidth)
                                      
                                      // Ensure waste doesn't extend beyond stock length
                                      const maxWasteWidth = 1000 - wasteXPx
                                      const finalWasteWidth = Math.min(wasteWPx, maxWasteWidth)
                                      
                                      // Draw boundary line between last part and waste
                                      const boundaryX = exactPartsEndPx + 0.5
                                      
                                      // DEBUG: Log waste calculation
                                      console.log(`[NESTING_DEBUG] Waste calculation for pattern ${patternIdx}:`, {
                                        lastPartIdx,
                                        lastPartXEnd_raw: partPositions[lastPartIdx].xEnd,
                                        exactPartsEndPx,
                                        wasteXPx,
                                        wasteWidth_raw: wasteWidth,
                                        wasteWPx,
                                        finalWasteWidth,
                                        maxWasteWidth,
                                        stockLength: 1000,
                                        waste_mm: pattern.waste,
                                        pxPerMm,
                                        shouldMatchLastPartEnd: exactPartsEndPx
                                      })
                                      
                                      // DEBUG: Log waste calculation
                                      console.log(`[NESTING_DEBUG] Waste calculation:`, {
                                        lastPartIdx,
                                        lastPartXEnd_raw: partPositions[lastPartIdx].xEnd,
                                        exactPartsEndPx,
                                        wasteXPx,
                                        wasteWidth_raw: wasteWidth,
                                        wasteWPx,
                                        finalWasteWidth,
                                        maxWasteWidth,
                                        stockLength: 1000,
                                        waste_mm: pattern.waste,
                                        pxPerMm
                                      })
                                        
                                        return (
                                          <g>
                                            {/* Waste area rectangle - start after boundary line to prevent overlap */}
                                            {/* Boundary line is at exactPartsEndPx + 0.5, so waste starts at exactPartsEndPx + 1 */}
                                          <rect
                                              x={wasteXPx + 1}
                                              y={0}
                                              width={Math.max(0, finalWasteWidth - 1)}
                                            height={barHeight}
                                              fill="#ffffff"
                                            stroke="none"
                                            shapeRendering="crispEdges"
                                              style={{ 
                                                imageRendering: 'pixelated',
                                                // Force integer pixel rendering
                                                transform: 'translateZ(0)'
                                              }}
                                            />
                                          </g>
                                        )
                                    })()}
                                  </g>
                                )
                                } catch (error) {
                                  console.error('[NestingReport] Error rendering SVG:', error)
                                  return (
                                    <text x="500" y="30" fill="#ff0000" fontSize="12" textAnchor="middle" dominantBaseline="middle">
                                      Error rendering visualization
                                    </text>
                                  )
                                }
                              })()}
                            </svg>
                            {/* Text labels rendered as absolute positioned divs outside SVG to prevent scaling */}
                            {(() => {
                              try {
                                // Calculate partPositions and partNameToNumber here for label rendering
                                const stockLengthMm = pattern.stock_length
                                const totalWidth = 1000
                                const pxPerMm = totalWidth / stockLengthMm
                                
                                // Create mapping from part name to its number in the cutting list table
                                // Use the EXACT same logic as in the SVG rendering section (lines 668-706)
                                const partNameToNumber = new Map<string, number>()
                                try {
                                  const partGroups = new Map<string, { name: string, length: number, count: number }>()
                                  
                                  pattern.parts.forEach((part) => {
                                    try {
                                      const partName = getDisplayPartName(part)
                                      const partLength = part?.length || 0
                                      
                                      if (partGroups.has(partName)) {
                                        const existing = partGroups.get(partName)!
                                        existing.count += 1
                                      } else {
                                        partGroups.set(partName, {
                                          name: partName,
                                          length: partLength,
                                          count: 1
                                        })
                                      }
                                    } catch (e) {
                                      // Ignore individual part errors
                                    }
                                  })
                                  
                                  // Convert to array and sort by length (longest first, same as cutting list table)
                                  const sortedGroups = Array.from(partGroups.values()).sort((a, b) => {
                                    // Sort by length descending (longest first)
                                    return b.length - a.length
                                  })
                                  
                                  // Create mapping: part name -> table number (1-indexed)
                                  sortedGroups.forEach((group, idx) => {
                                    partNameToNumber.set(group.name, idx + 1)
                                  })
                                  
                                } catch (e) {
                                  // If mapping fails, labels will fall back to part names
                                }
                                
                                // Calculate part positions (MUST match SVG section exactly)
                                // Use the order from the backend - it has already been optimized
                                // based on cut characteristics (straight cuts first, sloped cuts last)
                                // DO NOT re-sort here, as that would undo the backend optimization
                                const sortedParts = [...pattern.parts]
                                
                                // Calculate total length and scaling (same as SVG)
                                const totalPartsLengthMm = sortedParts.reduce((sum, part) => sum + (part.length || 0), 0)
                                const wasteMm = pattern.waste || 0
                                
                                // Use true scale (pxPerMm) for positioning parts (same as SVG section)
                                // This ensures waste area is visible at the end
                                
                                // Position parts without kerf gaps - gaps are visual only and shouldn't affect positioning
                                // Parts are positioned flush against each other based on their actual lengths
                                let cumulativeX = 0
                                const partPositions = sortedParts.map((part, partIdx) => {
                                  const lengthMm = part.length || 0
                                  const xStart = cumulativeX
                                  const xEnd = cumulativeX + (lengthMm * pxPerMm)
                                  
                                  // Move to next part position (no gap)
                                  cumulativeX = xEnd
                                  return { part, xStart, xEnd, lengthMm }
                                })
                                
                                return (
                                  <>
                                    {/* Part labels */}
                                    {partPositions.map(({ part, xStart, xEnd }, partIdx) => {
                                      // Use EXACT same calculations as SVG rendering section (lines 1150-1195)
                                      const lastPartIdx = partPositions.length - 1
                                      
                                      // Calculate exactPartsEndPx (same as SVG line 1129-1131)
                                      const exactPartsEndPx = partPositions.length > 0 
                                        ? Math.floor(partPositions[lastPartIdx].xEnd)
                                        : 0
                                      
                                      // Calculate xPx (same as SVG line 1150)
                                      const xPx = partIdx === 0 ? 0 : Math.floor(xStart)
                                      
                                      // Calculate endPx (same as SVG lines 1155-1168)
                                      let endPx: number
                                      if (partIdx === lastPartIdx && pattern.waste > 0) {
                                        endPx = exactPartsEndPx
                                      } else {
                                        endPx = Math.floor(xEnd)
                                      }
                                      
                                      // Calculate wPx (same as SVG line 1171)
                                      let wPx = endPx - xPx
                                      wPx = Math.max(1, Math.floor(wPx))
                                      
                                      // Get part number from mapping - use the EXACT same logic as SVG rendering
                                      const partName = getDisplayPartName(part)
                                      const partNameStr = String(partName || '')
                                      const partNumber = partNameToNumber.get(partNameStr)
                                      const displayLabel = partNumber ? String(partNumber) : partNameStr
                                      
                                      // Adjust font size based on part width for better readability
                                      let fontSize = '12px'
                                      if (wPx < 8) {
                                        fontSize = '8px'
                                      } else if (wPx < 12) {
                                        fontSize = '9px'
                                      } else if (wPx < 15) {
                                        fontSize = '10px'
                                      }
                                      
                                      // Show labels for all parts (removed width threshold)
                                      
                                      // Calculate actual polygon boundaries (same logic as SVG rendering lines 1288-1360)
                                      let topLeftX = xPx
                                      let topRightX = endPx
                                      
                                      try {
                                        // Get part end info - need to use finalPartEnds from SVG section
                                        // Since we can't access it, we'll calculate it the same way
                                        const partData = part?.part || {} as any
                                        const startRawAngle = (partData as any).start_angle || null
                                        const endRawAngle = (partData as any).end_angle || null
                                        
                                        // Simplified calculation - match SVG logic as closely as possible
                                        const startIsSlope = startRawAngle !== null && Math.abs(startRawAngle) > 0.5
                                        const endIsSlope = endRawAngle !== null && Math.abs(endRawAngle) > 0.5
                                        
                                        const startType = startIsSlope ? 'miter' : 'straight'
                                        const endType = endIsSlope ? 'miter' : 'straight'
                                        
                                        // Check if boundaries are shared (simplified - check if positions match)
                                        let startIsShared = false
                                        let endIsShared = false
                                        
                                        if (partIdx > 0) {
                                          const prevEnd = partIdx === lastPartIdx && pattern.waste > 0 
                                            ? exactPartsEndPx 
                                            : Math.floor(partPositions[partIdx - 1].xEnd)
                                          const thisStart = partIdx === 0 ? 0 : Math.floor(xStart)
                                          startIsShared = prevEnd === thisStart
                                        }
                                        
                                        if (partIdx < lastPartIdx) {
                                          const thisEnd = Math.floor(xEnd)
                                          const nextStart = Math.floor(partPositions[partIdx + 1].xStart)
                                          endIsShared = thisEnd === nextStart
                                        } else if (partIdx === lastPartIdx && pattern.waste > 0) {
                                          endIsShared = false
                                        }
                                        
                                        // Use same constants as SVG rendering
                                        const markerInset = 8
                                        const markerDiagonalOffset = 12
                                        
                                        // Calculate polygon boundaries (EXACT same logic as SVG lines 1305-1352)
                                        // Adjust for start cut (left side)
                                        if (partIdx === 0) {
                                          // First part: start at x=0 to eliminate gap with border
                                          if (startType === 'miter' && !startIsShared) {
                                            topLeftX = xPx
                                          } else {
                                            topLeftX = xPx
                                          }
                                        } else if (startType === 'miter' && !startIsShared) {
                                          topLeftX = xPx + markerInset
                                        } else if (startType === 'straight' && !startIsShared) {
                                          topLeftX = xPx + markerInset
                                        }
                                        
                                        // Adjust for end cut (right side) - EXACT same logic as SVG (lines 1330-1360)
                                        if (partIdx === lastPartIdx && pattern.waste > 0) {
                                          // Last part with waste: end exactly at exactPartsEndPx (no markerInset)
                                          topRightX = exactPartsEndPx
                                        } else if (partIdx === lastPartIdx && pattern.waste === 0) {
                                          // Last part with 0 waste: extends to end of stockbar (1000px)
                                          // When waste is 0, the part extends all the way to the stockbar border
                                          // Use the stockbar width (1000) directly to ensure it matches the SVG polygon
                                          // The SVG polygon also extends to 1000 when waste is 0
                                          topRightX = 1000
                                        } else if (endType === 'miter' && !endIsShared) {
                                          topRightX = endPx - markerInset
                                        } else if (endType === 'straight' && !endIsShared) {
                                          topRightX = endPx - markerInset
                                        } else {
                                          // For shared boundaries, use endPx (flush with neighbor)
                                          topRightX = endPx
                                        }
                                      } catch (e) {
                                        // Fallback to raw coordinates if calculation fails
                                        console.error('[NESTING] Error calculating polygon boundaries for label:', e)
                                      }
                                      
                                      // Calculate center position using actual polygon boundaries (same as SVG line 1360)
                                      const centerX = (topLeftX + topRightX) / 2
                                      const centerXPercent = (centerX / 1000) * 100
                                      
                                      return (
                                        <div
                                          key={`part-label-${partIdx}`}
                                          style={{
                                            position: 'absolute',
                                            left: `${centerXPercent}%`,
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            fontFamily: 'system-ui, -apple-system, sans-serif',
                                            fontSize: fontSize,
                                            fontWeight: '500',
                                            color: '#374151',
                                            textAlign: 'center',
                                            lineHeight: '12px',
                                            letterSpacing: '0',
                                            fontStretch: 'normal',
                                            fontVariant: 'normal',
                                            textRendering: 'geometricPrecision',
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                            zIndex: 10
                                          }}
                                        >
                                          {displayLabel}
                                        </div>
                                      )
                                    })}
                                    
                                    {/* Waste label removed as requested */}
                                  </>
                                )
                              } catch (error) {
                                console.error('[LABEL-RENDER] Error rendering labels:', error)
                                return null
                              }
                            })()}
                            </div>
                        </div>
                        {(pattern as any).exceeds_stock && (
                          <div className="mt-1 text-xs text-red-600 font-semibold">
                            ⚠️ This part ({formatLength(pattern.parts[0].length)}) is longer than the stock bar ({formatLength(pattern.stock_length)})
                          </div>
                        )}
                        {(pattern as any).sloped_cut_pattern && (
                          <div className="mt-2 text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded">
                            ✂️ Sloped cuts: Parts can be cut from same bar using complementary angles (waste from one cut becomes material for the other)
                          </div>
                        )}
                      </div>

                      {/* Cutting list table */}
                      <div className="text-sm mt-3 max-w-[65%]">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/60">
                                <TableHead className="w-[6%]">#</TableHead>
                                <TableHead className="w-[24%]">Profile Name</TableHead>
                                <TableHead className="w-[14%]">Part Name</TableHead>
                                <TableHead className="w-[14%]">Length (mm)</TableHead>
                                <TableHead className="w-[14%]">Quantity</TableHead>
                                <TableHead className="w-[14%]">Start Angle</TableHead>
                                <TableHead className="w-[14%]">End Angle</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                try {
                                  // Group parts by reference/name and count occurrences
                                  const partGroups = new Map<string, { name: string, length: number, count: number, startAngle: any, endAngle: any }>()
                                  
                                  pattern.parts.forEach((part) => {
                                    try {
                                      const partData = part?.part || {}
                                      const partName = partData.reference || partData.element_name || 'Unknown'
                                      const partLength = part?.length || 0
                                      const startAngle = partData.start_angle
                                      const endAngle = partData.end_angle
                                      
                                      if (partGroups.has(partName)) {
                                        const existing = partGroups.get(partName)!
                                        existing.count += 1
                                        // Use the length and angles from the first occurrence (they should all be the same)
                                      } else {
                                        partGroups.set(partName, {
                                          name: partName,
                                          length: partLength,
                                          count: 1,
                                          startAngle: startAngle,
                                          endAngle: endAngle
                                        })
                                      }
                                    } catch (e) {
                                      // Ignore individual part errors
                                    }
                                  })
                                  
                                  // Convert to array and sort by length (longest first)
                                  const sortedGroups = Array.from(partGroups.values()).sort((a, b) => {
                                    // Sort by length descending (longest first)
                                    return b.length - a.length
                                  })
                                  
                                  return sortedGroups.map((group, idx) => {
                                    // Always display length in mm
                                    const lengthMm = Math.round(group.length)
                                    const profileName = profile.profile_name || 'Unknown'
                                    
                                    // Format angles for display
                                    const formatAngle = (angle: any) => {
                                      if (angle === null || angle === undefined) return '90.0°'
                                      
                                      let numericAngle: number
                                      if (typeof angle === 'number') {
                                        numericAngle = angle
                                      } else if (typeof angle === 'string') {
                                        // Extract number from string
                                        const match = angle.match(/-?\d+(\.\d+)?/)
                                        numericAngle = match ? parseFloat(match[0]) : 90
                                      } else {
                                        return '90.0°'
                                      }
                                      
                                      // Format to 1 decimal place
                                      return `${numericAngle.toFixed(1)}°`
                                    }
                            
                            return (
                                      <TableRow key={idx}>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell>{profileName}</TableCell>
                                        <TableCell>{group.name}</TableCell>
                                        <TableCell>{lengthMm}</TableCell>
                                        <TableCell>{group.count}</TableCell>
                                        <TableCell>{formatAngle(group.startAngle)}</TableCell>
                                        <TableCell>{formatAngle(group.endAngle)}</TableCell>
                                      </TableRow>
                                    )
                                  })
                                } catch (error) {
                                  console.error('[NestingReport] Error generating cutting list:', error)
                                  return (
                                    <TableRow>
                                      <TableCell colSpan={7} className="text-destructive text-center">
                                        Error generating cutting list
                                      </TableCell>
                                    </TableRow>
                                  )
                                }
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
                    )}
                  </div>
                )
              })
              })()}
                        </div>
                      </div>
                    )}

                  {/* Tab 4: IFC Model View */}
                  {activeReportTab === 'model' && (
                    <div className="h-full flex justify-center" style={{ height: 'calc(100vh - 180px)' }}>
                      <div className="flex divide-x divide-gray-200 h-full w-full max-w-[1200px]">
                        {/* Left Panel - Profile List */}
                        <div className="w-[350px] flex-shrink-0 flex flex-col h-full">
                          <div className="p-4 flex-shrink-0">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                if (modelViewSelectedProfiles.size === nestingReport.profiles.length) {
                                  setModelViewSelectedProfiles(new Set())
                                } else {
                                  setModelViewSelectedProfiles(new Set(nestingReport.profiles.map(p => p.profile_name)))
                                }
                              }}
                            >
                              {modelViewSelectedProfiles.size === nestingReport.profiles.length ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                            {nestingReport.profiles.map((profile) => {
                              const isSelected = modelViewSelectedProfiles.has(profile.profile_name)
                              return (
                                <label
                                  key={profile.profile_name}
                                  className={`block py-4 px-3 border rounded-xl cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'border-[#00817A]'
                                      : 'border-gray-200 hover:bg-white/50'
                                  }`}
                                  style={isSelected ? { backgroundColor: 'rgba(0, 129, 122, 0.08)' } : {}}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0 w-5 h-5">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          const newSelection = new Set(modelViewSelectedProfiles)
                                          if (isSelected) {
                                            newSelection.delete(profile.profile_name)
                                          } else {
                                            newSelection.add(profile.profile_name)
                                          }
                                          setModelViewSelectedProfiles(newSelection)
                                        }}
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
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold truncate">
                                        {profile.profile_name}
                                      </div>
                                    </div>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        {/* Right Panel - IFC Viewer */}
                        <div className="flex-1 overflow-hidden h-full">
                          <IFCViewerWebIFC
                            filename={filename}
                            ifcStorageKey={ifcStorageKey}
                            isVisible={true}
                            selectedProfiles={modelViewSelectedProfiles}
                            backgroundColor="#F9FAFB"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div> {/* End of nesting-report-pdf-content */}
              </div> {/* End of max-w-[1200px] container */}
            </div> {/* End of content area */}
          </div>
        )}

        {/* Settings Modal - Outside step conditionals so it's accessible from any step */}
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nesting Settings</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
                  {/* Kerf Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="kerf">
                      Kerf (Cutting Width)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="kerf"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={kerfValue}
                        onChange={(e) => setKerfValue(parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">mm</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Distance between parts to account for cutting blade width (typically 3mm for steel)
                    </p>
                  </div>

                  {/* Trim Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="trim">
                      Trim (End Cut)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="trim"
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        value={trimValue}
                        onChange={(e) => setTrimValue(Math.min(50, parseFloat(e.target.value) || 0))}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">mm</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Material removed from stock bar ends for clean cuts
                    </p>
                  </div>

                  {/* Stock Tolerance Setting */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="stockTolerance"
                        checked={stockToleranceEnabled}
                        onChange={(e) => setStockToleranceEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-input"
                      />
                      <Label htmlFor="stockTolerance" className="cursor-pointer">
                        Enable Stock Tolerance
                      </Label>
                    </div>
                    {stockToleranceEnabled && (
                      <div className="flex items-center gap-3 ml-7">
                        <Label htmlFor="toleranceValue" className="text-sm">Value:</Label>
                        <Input
                          id="toleranceValue"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={stockToleranceValue}
                          onChange={(e) => setStockToleranceValue(Math.min(100, parseFloat(e.target.value) || 0))}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">mm</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {stockToleranceEnabled 
                        ? `Stock bars have 10-50mm excess beyond nominal length. We add ${stockToleranceValue}mm to account for this.`
                        : 'Stock bars treated as exact nominal length.'
                      }
                    </p>
                  </div>

                  {/* Stock Lengths Setting */}
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-semibold">
                      Stock Bar Lengths (up to 5)
                    </Label>
                    <div className="space-y-2">
                      {stockLengths.map((stock, idx) => (
                        <div key={stock.id} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground font-medium w-8">{idx + 1}.</span>
                          <Input
                            type="number"
                            min="1000"
                            max="20000"
                            step="100"
                            value={stock.value}
                            onChange={(e) => {
                              const val = e.target.value
                              const parsedVal = val === '' ? 0 : parseFloat(val)
                              setStockLengths(stockLengths.map(s => 
                                s.id === stock.id ? {...s, value: parsedVal} : s
                              ))
                            }}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">mm</span>
                          <span className="text-sm text-muted-foreground">({(stock.value / 1000).toFixed(1)}m)</span>
                          {stockLengths.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setStockLengths(stockLengths.filter(s => s.id !== stock.id))
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {stockLengths.length < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setStockLengths([...stockLengths, {id: nextStockId, value: 6000}])
                          setNextStockId(nextStockId + 1)
                        }}
                        className="mt-3"
                      >
                        + Add Stock Length
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Common lengths: 6000mm (6m), 12000mm (12m)
                    </p>
                  </div>
                </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettingsModal(false)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  saveSettings()
                }}
              >
                Save Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Nesting Modal */}
        <Dialog open={showConfirmNestingModal} onOpenChange={setShowConfirmNestingModal}>
          <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto p-0 gap-0">
            <div className="px-6 pt-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900 tracking-tight">Confirm Nesting Configuration</DialogTitle>
                <DialogDescription className="text-base text-gray-600 mt-2 leading-relaxed">
                  Review your selection and technical settings before running the nesting engine.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 space-y-6 pb-6">
              {/* Profile Summary */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Selected Profiles Summary</h3>
                <div className="grid grid-cols-3 divide-x divide-gray-200">
                  {/* Profile Types Card */}
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#00817A15' }}>
                      <img 
                        src="/Icons/Profile qty.svg" 
                        alt="Profile Types" 
                        className="h-7 w-7"
                        style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(46%) saturate(1234%) hue-rotate(141deg) brightness(94%) contrast(101%)' }}
                      />
                    </div>
                    <div className="text-2xl font-semibold text-primary">{selectedProfiles.size}</div>
                    <div className="text-sm text-gray-600 mt-1">Profile Types</div>
                  </div>

                  {/* Weight Card */}
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#00817A15' }}>
                      <img 
                        src="/Icons/pdf-Weight.svg" 
                        alt="Weight" 
                        className="h-7 w-7"
                        style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(46%) saturate(1234%) hue-rotate(141deg) brightness(94%) contrast(101%)' }}
                      />
                    </div>
                    <div className="text-2xl font-semibold text-primary">
                      {report ? 
                        (report.profiles
                          .filter(p => selectedProfiles.has(p.profile_name))
                          .reduce((sum, p) => sum + p.total_weight, 0) / 1000).toFixed(2)
                        : '0.00'
                      }
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Weight (t)</div>
                  </div>

                  {/* Cuts Quantity Card */}
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#00817A15' }}>
                      <img 
                        src="/Icons/pdf-Cuttinqty.svg" 
                        alt="Cuts" 
                        className="h-7 w-7"
                        style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(46%) saturate(1234%) hue-rotate(141deg) brightness(94%) contrast(101%)' }}
                      />
                    </div>
                    <div className="text-2xl font-semibold text-primary">
                      {report ? 
                        report.profiles
                          .filter(p => selectedProfiles.has(p.profile_name))
                          .reduce((sum, p) => sum + p.piece_count, 0)
                          .toLocaleString('en-US')
                        : '0'
                      }
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Cuts Quantity</div>
                  </div>
                </div>
              </div>

              {/* Technical Settings */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-base font-semibold text-gray-900">Technical Settings</h3>
                <div className="space-y-4 text-base">
                  <div className="flex items-center gap-3">
                    <img src="/Icons/kerf for section.svg" alt="Kerf" className="h-5 w-5 opacity-70" />
                    <span className="text-gray-600">Saw Kerf:</span>
                    <span className="font-medium text-gray-900">{kerfValue} (mm)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src="/Icons/trim for section.svg" alt="Trim" className="h-5 w-5 opacity-70" />
                    <span className="text-gray-600">Trim:</span>
                    <span className="font-medium text-gray-900">{trimValue} (mm)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src="/Icons/tolerance for section.svg" alt="Tolerance" className="h-5 w-5 opacity-70" />
                    <span className="text-gray-600">Tolerance Stockbar:</span>
                    <span className="font-medium text-gray-900">
                      {stockToleranceEnabled ? `${stockToleranceValue} (mm)` : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    <span className="font-semibold">Note:</span> For leftover stock bars, only kerf is applied during nesting calculations. Trim and tolerance are not applied as these bars are already cut to exact lengths.
                  </p>
                </div>
              </div>

              {/* Approval Checkbox */}
              <div className="border-t border-gray-200 pt-6">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="relative flex-shrink-0 w-6 h-6 mt-0.5">
                    <input
                      type="checkbox"
                      checked={nestingApproved}
                      onChange={(e) => setNestingApproved(e.target.checked)}
                      className="appearance-none w-6 h-6 border-2 border-gray-300 rounded-full cursor-pointer transition-all checked:bg-[#00817A] checked:border-[#00817A] focus:ring-2 focus:ring-[#00817A] focus:ring-offset-1"
                    />
                    {nestingApproved && (
                      <svg 
                        className="absolute inset-0 w-6 h-6 text-white pointer-events-none p-1"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-base">I confirm the nesting configuration</p>
                    <p className="text-gray-600 mt-1.5 text-base leading-relaxed">
                      I have reviewed the selected profiles and technical settings and approve running the nesting engine with this configuration.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowConfirmNestingModal(false)
                  setNestingApproved(false)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  console.log('[MODAL] Run Nesting Engine clicked')
                  console.log('[MODAL] nestingApproved:', nestingApproved)
                  setShowConfirmNestingModal(false)
                  console.log('[MODAL] About to call generateNesting()')
                  generateNesting()
                }}
                disabled={!nestingApproved}
                className="min-w-[180px]"
              >
                Run Nesting Engine
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* BOM Export Modal */}
        <Dialog open={showBOMModal} onOpenChange={setShowBOMModal}>
          <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <img src="/Icons/export icon.svg" alt="Export" className="h-5 w-5" />
                Export Bill Of Materials to PDF
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-8 py-6">
              {/* Summary Cards */}
              {(() => {
                const selectedProfilesCount = bomSelectedProfiles.size
                const totalWeight = nestingReport && report ? 
                  nestingReport.profiles
                    .filter(profile => bomSelectedProfiles.has(profile.profile_name))
                    .reduce((sum, profile) => {
                      const profileData = report.profiles.find(p => p.profile_name === profile.profile_name)
                      if (!profileData || profile.total_length === 0) return sum
                      
                      const weightPerMeter = profileData.total_weight / (profile.total_length / 1000.0)
                      const profileTonnage = Object.entries(profile.stock_lengths_used).reduce((stockSum, [stockLengthStr, barCount]) => {
                        const stockLengthM = parseFloat(stockLengthStr) / 1000.0
                        return stockSum + (weightPerMeter * stockLengthM * barCount) / 1000.0
                      }, 0)
                      
                      return sum + profileTonnage
                    }, 0) : 0
                
                return (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Profile Types Card */}
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <img src="/Icons/Profile qty.svg?v=2" alt="Profile" className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary">{selectedProfilesCount}</p>
                          <p className="text-xs text-muted-foreground">Profile Types</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Weight Card */}
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <img src="/Icons/tonnage icon.svg?v=2" alt="Weight" className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary">{totalWeight.toFixed(3)} <span className="text-sm">(t)</span></p>
                          <p className="text-xs text-muted-foreground">Total Weight</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Project Name Input */}
              <div className="space-y-2">
                <Label htmlFor="bomProjectName">
                  Project Name
                </Label>
                <Input
                  id="bomProjectName"
                  type="text"
                  value={bomProjectName}
                  onChange={(e) => setBomProjectName(e.target.value)}
                  placeholder="Enter project name (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Project name will appear in the PDF header
                </p>
              </div>

              {/* Profile Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Select Profiles to Include
                </Label>
                <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-3">
                  {nestingReport && nestingReport.profiles.map((profile) => {
                    const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                    const tonnage = profileData ? (profileData.total_weight / 1000).toFixed(3) : '0.000'
                    
                    return (
                      <label 
                        key={profile.profile_name} 
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => {
                          const newSet = new Set(bomSelectedProfiles)
                          if (bomSelectedProfiles.has(profile.profile_name)) {
                            newSet.delete(profile.profile_name)
                          } else {
                            newSet.add(profile.profile_name)
                          }
                          setBomSelectedProfiles(newSet)
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            bomSelectedProfiles.has(profile.profile_name)
                              ? 'bg-[#008A67] border-[#008A67]'
                              : 'border-input bg-white'
                          }`}
                        >
                          {bomSelectedProfiles.has(profile.profile_name) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm">{profile.profile_name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {tonnage} tonnes
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which profiles to include in the BOM PDF
                </p>
              </div>

              {/* Select/Deselect All */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (nestingReport) {
                      if (bomSelectedProfiles.size === nestingReport.profiles.length) {
                        setBomSelectedProfiles(new Set())
                      } else {
                        setBomSelectedProfiles(new Set(nestingReport.profiles.map(p => p.profile_name)))
                      }
                    }
                  }}
                >
                  {bomSelectedProfiles.size === nestingReport?.profiles.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowBOMModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportBOMToPDF}
                disabled={bomSelectedProfiles.size === 0}
              >
                Generate PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cutting Plan Export Modal */}
        <Dialog open={showCuttingPlanModal} onOpenChange={setShowCuttingPlanModal}>
          <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <img src="/Icons/export icon.svg" alt="Export" className="h-5 w-5" />
                Export Cutting Plan to PDF
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-8 py-6">
              {/* Summary Cards */}
              {(() => {
                const selectedProfilesCount = cuttingPlanSelectedProfiles.size
                const totalWeight = nestingReport && report ? 
                  nestingReport.profiles
                    .filter(profile => cuttingPlanSelectedProfiles.has(profile.profile_name))
                    .reduce((sum, profile) => {
                      const profileData = report.profiles.find(p => p.profile_name === profile.profile_name)
                      return sum + (profileData ? profileData.total_weight / 1000 : 0)
                    }, 0) : 0
                
                return (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Profile Types Card */}
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <img src="/Icons/Profile qty.svg?v=2" alt="Profile" className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary">{selectedProfilesCount}</p>
                          <p className="text-xs text-muted-foreground">Profile Types</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Weight Card */}
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <img src="/Icons/tonnage icon.svg?v=2" alt="Weight" className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary">{totalWeight.toFixed(3)} <span className="text-sm">(t)</span></p>
                          <p className="text-xs text-muted-foreground">Total Weight</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Project Name Input */}
              <div className="space-y-2">
                <Label htmlFor="cuttingPlanProjectName">
                  Project Name
                </Label>
                <Input
                  id="cuttingPlanProjectName"
                  type="text"
                  value={cuttingPlanProjectName}
                  onChange={(e) => setCuttingPlanProjectName(e.target.value)}
                  placeholder="Enter project name (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Project name will appear in the PDF header
                </p>
              </div>

              {/* Profile Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Select Profiles to Include
                </Label>
                <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-3">
                  {nestingReport && nestingReport.profiles
                    .filter(profile => profile.cutting_patterns.length > 0)
                    .map((profile) => {
                    const profileData = report?.profiles.find(p => p.profile_name === profile.profile_name)
                    const tonnage = profileData ? (profileData.total_weight / 1000).toFixed(3) : '0.000'
                    
                    return (
                      <label 
                        key={profile.profile_name} 
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => {
                          const newSet = new Set(cuttingPlanSelectedProfiles)
                          if (cuttingPlanSelectedProfiles.has(profile.profile_name)) {
                            newSet.delete(profile.profile_name)
                          } else {
                            newSet.add(profile.profile_name)
                          }
                          setCuttingPlanSelectedProfiles(newSet)
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            cuttingPlanSelectedProfiles.has(profile.profile_name)
                              ? 'bg-[#008A67] border-[#008A67]'
                              : 'border-input bg-white'
                          }`}
                        >
                          {cuttingPlanSelectedProfiles.has(profile.profile_name) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm">{profile.profile_name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {tonnage} tonnes
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which profiles to include in the Cutting Plan PDF
                </p>
              </div>

              {/* Select/Deselect All */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (nestingReport) {
                      const profilesWithPatterns = nestingReport.profiles.filter(p => p.cutting_patterns.length > 0)
                      if (cuttingPlanSelectedProfiles.size === profilesWithPatterns.length) {
                        setCuttingPlanSelectedProfiles(new Set())
                      } else {
                        setCuttingPlanSelectedProfiles(new Set(profilesWithPatterns.map(p => p.profile_name)))
                      }
                    }
                  }}
                >
                  {(() => {
                    const profilesWithPatterns = nestingReport?.profiles.filter(p => p.cutting_patterns.length > 0) || []
                    return cuttingPlanSelectedProfiles.size === profilesWithPatterns.length ? 'Deselect All' : 'Select All'
                  })()}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowCuttingPlanModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportCuttingPlanToPDF}
                disabled={cuttingPlanSelectedProfiles.size === 0}
              >
                Generate PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lottie Loading Animation */}
        {exportProgress.show && (
          <LottieLoader 
            message={loadingMessage} 
            animationPath="/animations/Loading.json"
            size={250}
            showProgress={true}
            progress={(exportProgress.current / exportProgress.total) * 100}
          />
        )}
        {loading && (
          <LottieLoader 
            message={loadingMessage} 
            animationPath="/animations/Data visualization.json"
            size={600}
            showProgress={true}
            progress={loadingProgress}
          />
        )}

        {/* Shadcn-styled tooltip for stockbar parts */}
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-md border border-border">
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Profile:</span>
                  <span className="text-muted-foreground">{tooltip.profileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Part:</span>
                  <span className="text-muted-foreground">{tooltip.partName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Length:</span>
                  <span className="text-muted-foreground">{tooltip.length.toFixed(0)}mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Start:</span>
                  <span className="text-muted-foreground">{tooltip.startAngle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">End:</span>
                  <span className="text-muted-foreground">{tooltip.endAngle}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

