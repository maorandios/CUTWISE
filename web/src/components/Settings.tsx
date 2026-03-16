import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from './Header'
import { Footer } from './Footer'
import { toast } from 'sonner'
import { Settings as SettingsIcon, User, Wrench, FileText, Lock, CreditCard } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCompany } from '../hooks/useCompany'
import { useCredits } from '../hooks/useCredits'
import { PayPalCheckout } from './PayPalCheckout'

interface CompanyDetails {
  companyName: string
  address: string
  country: string
  phoneNumber: string
  companySize: '1' | '1-10' | '10-50' | '50-300' | '300+' | ''
  email?: string
}

interface NestingSettings {
  kerf: number
  trim: number
  stockToleranceEnabled: boolean
  stockToleranceValue: number
  stockLengths: { id: number; value: number }[]
}

interface SettingsProps {
  onBack: () => void
  onLogout: () => void
  companyDetails: CompanyDetails
  onSaveCompanyDetails: (details: CompanyDetails) => void
  nestingSettings?: NestingSettings
  onSaveNestingSettings?: (settings: NestingSettings) => void
}

type SettingsTab = 'general' | 'account' | 'technical' | 'billing' | 'terms' | 'privacy'

const Settings = ({ 
  onBack, 
  onLogout, 
  companyDetails, 
  onSaveCompanyDetails,
  nestingSettings,
  onSaveNestingSettings
}: SettingsProps) => {
  const { user, verifyPassword, updatePassword } = useAuth()
  const { company, saveCompany } = useCompany()
  const { credits, totalCreditsPurchased, payments, usageHistory, loading: creditsLoading } = useCredits()
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [generalDetails, setGeneralDetails] = useState<CompanyDetails>(companyDetails)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<{type: string, credits: number, amount: number, name: string} | null>(null)

  // Check if user signed up with OAuth (Google)
  const isOAuthUser = user?.app_metadata?.provider !== 'email'

  // Account tab state
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Update email when user changes
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user])

  // Lock body scroll when payment modal is open
  useEffect(() => {
    if (showPaymentModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showPaymentModal])

  // Technical tab state
  const [technicalSettings, setTechnicalSettings] = useState<NestingSettings>(
    nestingSettings || {
      kerf: 3.0,
      trim: 5.0,
      stockToleranceEnabled: true,
      stockToleranceValue: 10.0,
      stockLengths: [
        { id: 1, value: 6000 },
        { id: 2, value: 12000 }
      ]
    }
  )
  const [nextStockId, setNextStockId] = useState<number>(3)
  const [addingStockLength, setAddingStockLength] = useState(false)
  const [newStockLengthValue, setNewStockLengthValue] = useState('')

  useEffect(() => {
    setGeneralDetails(companyDetails)
    // Get email from current user (stored during signup/login)
    try {
      const data = localStorage.getItem('cutwise_current_user')
      const user = data ? JSON.parse(data) : null
      if (user?.email) {
        setEmail(user.email)
      } else if (user?.userName && user.userName.includes('@')) {
        setEmail(user.userName) // Username is actually an email
      }
    } catch (e) {
      console.error('Failed to load user email:', e)
    }
  }, [companyDetails])

  // Load technical settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('cutwise_nesting_settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setTechnicalSettings({
          kerf: settings.kerf || 3.0,
          trim: settings.trim || 5.0,
          stockToleranceEnabled: settings.toleranceEnabled !== undefined ? settings.toleranceEnabled : true,
          stockToleranceValue: settings.tolerance || 10.0,
          stockLengths: settings.stockLengths || [{ id: 1, value: 6000 }, { id: 2, value: 12000 }]
        })
        
        // Update nextStockId based on loaded data
        if (settings.stockLengths && settings.stockLengths.length > 0) {
          const maxId = Math.max(...settings.stockLengths.map((s: any) => s.id))
          setNextStockId(maxId + 1)
        }
      } catch (e) {
        console.error('Failed to load technical settings:', e)
      }
    }
  }, [])

  const handleSaveGeneral = async () => {
    if (!generalDetails.companyName.trim()) {
      toast.error('Company name is required')
      return
    }

    const success = await saveCompany({ ...generalDetails, email })
    if (success) {
      onSaveCompanyDetails({ ...generalDetails, email })
      toast.success('General settings saved successfully!')
    } else {
      toast.error('Failed to save settings')
    }
  }

  const handleSaveTechnical = () => {
    // Check for duplicate stock lengths
    const values = technicalSettings.stockLengths.map(s => s.value)
    const hasDuplicates = values.some((val, idx) => values.indexOf(val) !== idx)
    
    if (hasDuplicates) {
      toast.error('Cannot save: Duplicate stock lengths found. Each stock length must be unique.')
      return
    }
    
    // Save to localStorage in the format NestingReport expects
    const settings = {
      kerf: technicalSettings.kerf,
      trim: technicalSettings.trim,
      toleranceEnabled: technicalSettings.stockToleranceEnabled,
      tolerance: technicalSettings.stockToleranceValue,
      stockLengths: technicalSettings.stockLengths
    }
    localStorage.setItem('cutwise_nesting_settings', JSON.stringify(settings))
    
    if (onSaveNestingSettings) {
      onSaveNestingSettings(technicalSettings)
    }
    
    toast.success('Technical settings saved successfully!')
  }

  const handleSavePassword = async () => {
    // Validation
    if (!currentPassword.trim()) {
      toast.error('Please enter your current password')
      return
    }

    if (!newPassword.trim()) {
      toast.error('Please enter a new password')
      return
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password')
      return
    }

    try {
      // First, verify the current password
      const { error: verifyError } = await verifyPassword(currentPassword)

      if (verifyError) {
        toast.error('Current password is incorrect')
        return
      }

      // If verification succeeds, update to new password
      const { error } = await updatePassword(newPassword)

      if (error) {
        toast.error(error.message || 'Failed to update password')
        return
      }

      // Success - clear fields and show success message
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully! A confirmation email has been sent.')
    } catch (err) {
      toast.error('An error occurred while updating password')
      console.error('Password update error:', err)
    }
  }

  const menuItems = [
    { id: 'general' as SettingsTab, label: 'General', icon: SettingsIcon },
    { id: 'account' as SettingsTab, label: 'Account', icon: User },
    { id: 'technical' as SettingsTab, label: 'Technical', icon: Wrench },
    { id: 'billing' as SettingsTab, label: 'Billing and Usage', icon: CreditCard },
    { id: 'terms' as SettingsTab, label: 'Terms and Conditions', icon: FileText },
    { id: 'privacy' as SettingsTab, label: 'Privacy Policy', icon: Lock },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        onSettingsClick={() => {}}
        onLogout={onLogout}
        showUploadButton={false}
        title="Settings"
        showBackButton={true}
        onBackClick={onBack}
      />

      <div className="flex-1 flex justify-center bg-gray-50">
        <div className="w-full max-w-[1200px] flex bg-background">
          {/* Left Sidebar Menu */}
          <div className="w-80 bg-background border-r border-gray-200">
            <nav className="px-4 pb-4 pt-16 space-y-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                      isActive
                        ? 'bg-[#0A5048] text-white font-semibold rounded-[45px]'
                        : 'hover:bg-muted-foreground/10 text-foreground rounded-[45px]'
                    }`}
                  >
                    <IconComponent 
                      className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} 
                      strokeWidth={1.5} 
                    />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[800px] mx-auto px-8 pb-8 pt-16">
              {/* General Tab */}
              {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">General Settings</h2>
                  <p className="text-muted-foreground">Manage your company information</p>
                </div>

                <div className="space-y-6 bg-card p-6 rounded-lg">
                  <div className="space-y-2 max-w-[60%]">
                    <Label htmlFor="companyName">
                      Company Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={generalDetails.companyName}
                      onChange={(e) => setGeneralDetails({ ...generalDetails, companyName: e.target.value })}
                      placeholder="Enter your company name"
                    />
                  </div>

                  <div className="space-y-2 max-w-[60%]">
                    <Label htmlFor="address">
                      Address <span className="text-muted-foreground text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      value={generalDetails.address}
                      onChange={(e) => setGeneralDetails({ ...generalDetails, address: e.target.value })}
                      placeholder="Enter your address"
                    />
                  </div>

                  <div className="space-y-2 max-w-[60%]">
                    <Label htmlFor="country">
                      Country <span className="text-muted-foreground text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="country"
                      type="text"
                      value={generalDetails.country}
                      onChange={(e) => setGeneralDetails({ ...generalDetails, country: e.target.value })}
                      placeholder="Enter your country"
                    />
                  </div>

                  <div className="space-y-2 max-w-[60%]">
                    <Label htmlFor="phoneNumber">
                      Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={generalDetails.phoneNumber}
                      onChange={(e) => setGeneralDetails({ ...generalDetails, phoneNumber: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2 max-w-[60%]">
                    <Label htmlFor="companySize">
                      Company Size <span className="text-muted-foreground text-xs">(Optional)</span>
                    </Label>
                    <Select
                      value={generalDetails.companySize}
                      onValueChange={(value) => setGeneralDetails({ ...generalDetails, companySize: value as CompanyDetails['companySize'] })}
                    >
                      <SelectTrigger id="companySize">
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Just me</SelectItem>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="10-50">10-50 employees</SelectItem>
                        <SelectItem value="50-300">50-300 employees</SelectItem>
                        <SelectItem value="300+">300+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="max-w-[60%]">
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onBack}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveGeneral}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
                  <p className="text-muted-foreground">Manage your account credentials and preferences</p>
                </div>

                <div className="space-y-6 bg-card p-6 rounded-lg">
                  <div className="space-y-2 max-w-[60%]">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      className="bg-muted cursor-not-allowed"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  {isOAuthUser ? (
                    // OAuth users - show message about Google-managed password
                    <div className="border-t border-border pt-6 mt-6">
                      <h3 className="text-lg font-semibold mb-4">Password</h3>
                      <div className="bg-muted/50 p-4 rounded-lg max-w-[60%]">
                        <p className="text-sm text-muted-foreground">
                          You signed in with Google. Your password is managed through your Google account.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          To change your password, please visit your{' '}
                          <a 
                            href="https://myaccount.google.com/security" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Google Account Security settings
                          </a>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Email users - show password change form
                    <div className="border-t border-border pt-6 mt-6">
                      <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                      
                      <div className="space-y-4 max-w-[60%]">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isOAuthUser && (
                  <div className="max-w-[60%]">
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={onBack}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePassword}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Technical Tab */}
            {activeTab === 'technical' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Technical Settings</h2>
                  <p className="text-muted-foreground">Configure default nesting generation parameters</p>
                </div>

                <div className="space-y-6 bg-card p-6 rounded-lg max-w-[60%]">
                  <div className="space-y-2">
                    <Label htmlFor="kerf">Saw Kerf (mm)</Label>
                    <Input
                      id="kerf"
                      type="number"
                      step="0.1"
                      value={technicalSettings.kerf}
                      onChange={(e) => setTechnicalSettings({ ...technicalSettings, kerf: parseFloat(e.target.value) || 0 })}
                      placeholder="3.0"
                      className="max-w-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">Width of material removed by saw blade during cutting</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trim">Manual Trim (mm)</Label>
                    <Input
                      id="trim"
                      type="number"
                      step="0.1"
                      value={technicalSettings.trim}
                      onChange={(e) => setTechnicalSettings({ ...technicalSettings, trim: parseFloat(e.target.value) || 0 })}
                      placeholder="5.0"
                      className="max-w-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">Extra material to trim from each end of the stock bar</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stockTolerance">Stockbar Tolerance (mm)</Label>
                    <Input
                      id="stockTolerance"
                      type="number"
                      step="1"
                      value={technicalSettings.stockToleranceValue}
                      onChange={(e) => setTechnicalSettings({ ...technicalSettings, stockToleranceValue: parseFloat(e.target.value) || 0 })}
                      placeholder="20.0"
                      className="max-w-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">Allow slight overhang beyond stock length</p>
                  </div>

                  <div className="space-y-4">
                    <Label>Purchased Stock Lengths</Label>
                    <div className="flex flex-wrap gap-2">
                      {technicalSettings.stockLengths
                        .sort((a, b) => b.value - a.value) // Sort descending (largest to smallest)
                        .map((stock) => (
                        <div
                          key={stock.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
                        >
                          <span>{stock.value.toLocaleString()}mm</span>
                          {technicalSettings.stockLengths.length > 1 && (
                            <button
                              onClick={() => {
                                const newStockLengths = technicalSettings.stockLengths.filter(s => s.id !== stock.id)
                                setTechnicalSettings({ ...technicalSettings, stockLengths: newStockLengths })
                              }}
                              className="hover:bg-gray-200 rounded p-0.5 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {/* Add Stock Input */}
                      {addingStockLength ? (
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-gray-300">
                          <Input
                            type="number"
                            placeholder="Length (mm)"
                            value={newStockLengthValue}
                            onChange={(e) => setNewStockLengthValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const value = parseFloat(newStockLengthValue)
                                if (value && value >= 1000 && value <= 20000) {
                                  // Check for duplicates
                                  const isDuplicate = technicalSettings.stockLengths.some(s => s.value === value)
                                  if (!isDuplicate) {
                                    setTechnicalSettings({
                                      ...technicalSettings,
                                      stockLengths: [...technicalSettings.stockLengths, { id: nextStockId, value }].sort((a, b) => b.value - a.value)
                                    })
                                    setNextStockId(nextStockId + 1)
                                    setAddingStockLength(false)
                                    setNewStockLengthValue('')
                                  } else {
                                    toast.error('This stock length already exists')
                                  }
                                } else {
                                  setAddingStockLength(false)
                                  setNewStockLengthValue('')
                                }
                              }
                            }}
                            onBlur={() => {
                              const value = parseFloat(newStockLengthValue)
                              if (value && value >= 1000 && value <= 20000) {
                                // Check for duplicates
                                const isDuplicate = technicalSettings.stockLengths.some(s => s.value === value)
                                if (!isDuplicate) {
                                  setTechnicalSettings({
                                    ...technicalSettings,
                                    stockLengths: [...technicalSettings.stockLengths, { id: nextStockId, value }].sort((a, b) => b.value - a.value)
                                  })
                                  setNextStockId(nextStockId + 1)
                                } else {
                                  toast.error('This stock length already exists')
                                }
                              }
                              setAddingStockLength(false)
                              setNewStockLengthValue('')
                            }}
                            className="w-28 h-7 text-sm border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-400"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingStockLength(true)}
                          className="inline-flex items-center gap-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Add
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Common lengths: 6000mm (6m), 12000mm (12m)
                    </p>
                  </div>
                </div>

                <div className="max-w-[60%]">
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onBack}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTechnical}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Billing and Usage Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Billing and Usage</h2>
                    <p className="text-muted-foreground">Manage your credits and view usage history</p>
                  </div>
                  <Button 
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-[#0A5048] hover:bg-[#0d6b5f] text-white flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                    Purchase New Credits
                  </Button>
                </div>

                {/* Credit Statistics Cards */}
                <div className="bg-white rounded-lg p-6 flex divide-x divide-gray-200">
                  {/* Available Credits */}
                  <div className="flex-1 pr-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <CreditCard className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Available Credits</p>
                      <h3 className="text-3xl font-bold text-gray-900">
                        {creditsLoading ? '...' : credits}
                      </h3>
                    </div>
                  </div>

                  {/* Credits Used */}
                  <div className="flex-1 px-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <svg 
                          className="w-6 h-6 text-gray-600" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth={1.5} 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" 
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Credits Used</p>
                      <h3 className="text-3xl font-bold text-gray-900">
                        {creditsLoading ? '...' : usageHistory.reduce((sum, usage) => sum + usage.credits_used, 0)}
                      </h3>
                    </div>
                  </div>

                  {/* Credits Purchased */}
                  <div className="flex-1 pl-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <svg 
                          className="w-6 h-6 text-gray-600" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth={1.5} 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" 
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Credits Purchased</p>
                      <h3 className="text-3xl font-bold text-gray-900">
                        {creditsLoading ? '...' : totalCreditsPurchased}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Payment History</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Plan</th>
                          <th className="text-left p-3 text-sm font-semibold">Credits</th>
                          <th className="text-left p-3 text-sm font-semibold">Date</th>
                          <th className="text-right p-3 text-sm font-semibold">Amount</th>
                          <th className="text-right p-3 text-sm font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center p-6 text-muted-foreground">
                              No payment history yet
                            </td>
                          </tr>
                        ) : (
                          payments.map((payment) => {
                            // Map plan types to display names
                            const planDisplayName = payment.plan_type === 'single' 
                              ? 'Single Use'
                              : payment.plan_type === 'pack_20'
                              ? 'Light Pack'
                              : payment.plan_type === 'pack_50'
                              ? 'Heavy Pack'
                              : payment.plan_type.replace(/_/g, ' ')
                            
                            return (
                            <tr key={payment.id} className="border-t hover:bg-muted/50">
                              <td className="p-3 text-sm">
                                {planDisplayName}
                              </td>
                              <td className="p-3 text-sm">{payment.credits_purchased}</td>
                              <td className="p-3 text-sm">
                                {new Date(payment.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="p-3 text-sm text-right font-semibold">
                                {payment.currency} {payment.amount.toFixed(2)}
                              </td>
                              <td className="p-3 text-sm text-right">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  payment.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Usage History */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Usage History</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Projects</th>
                          <th className="text-left p-3 text-sm font-semibold">Date</th>
                          <th className="text-right p-3 text-sm font-semibold">Credits Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageHistory.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center p-6 text-muted-foreground">
                              No usage history yet
                            </td>
                          </tr>
                        ) : (
                          usageHistory.map((usage) => (
                            <tr key={usage.id} className="border-t hover:bg-muted/50">
                              <td className="p-3 text-sm">{usage.project_name}</td>
                              <td className="p-3 text-sm">
                                {new Date(usage.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="p-3 text-sm text-right font-semibold">
                                {usage.credits_used}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Trust Footer */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex flex-col items-center gap-4">
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

                {/* Payment Modal */}
                {showPaymentModal && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedPlan(null)
                  }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      {!selectedPlan ? (
                        // Step 1: Plan Selection
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
                              <p className="text-gray-600 mt-2">Select the perfect credit package for your needs</p>
                            </div>
                            <button 
                              onClick={() => setShowPaymentModal(false)}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                                <div className="border-t border-gray-200 pt-6">
                                  <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-5xl font-bold text-gray-900">€1</span>
                                  </div>
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-sm font-semibold text-gray-900">1 Project</span>
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Everything Included:</p>
                                    <div className="space-y-2.5">
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
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                                POPULAR
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900/10 rounded-xl mb-4 group-hover:bg-gray-900/20 transition-colors">
                                    <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                    </svg>
                                  </div>
                                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Light Pack</h3>
                                  <p className="text-gray-600 text-sm">Best for regular users</p>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                  <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-5xl font-bold text-gray-900">€499</span>
                                  </div>
                                  <p className="text-sm text-gray-900 font-semibold mb-6">Save 14% • €24.95 per project</p>
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-sm font-semibold text-gray-900">20 Projects</span>
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Everything Included:</p>
                                    <div className="space-y-2.5">
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

                                <button className="w-full bg-[#0A5048] hover:bg-[#0d6b5f] text-white font-semibold py-3 rounded-xl transition-colors shadow-lg">
                                  Select Plan
                                </button>
                              </div>
                            </div>

                            {/* Heavy Pack - Best Value */}
                            <div 
                              onClick={() => setSelectedPlan({type: 'pack_50', credits: 50, amount: 999.00, name: 'Heavy Pack'})}
                              className="group relative bg-gradient-to-br from-amber-50 to-white border-2 border-amber-400 rounded-2xl p-6 cursor-pointer hover:border-amber-500 hover:shadow-xl transition-all duration-300"
                            >
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                                BEST VALUE
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-xl mb-4 group-hover:bg-amber-200 transition-colors">
                                    <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                                    </svg>
                                  </div>
                                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Heavy Pack</h3>
                                  <p className="text-gray-600 text-sm">Maximum savings for power users</p>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                  <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-5xl font-bold text-gray-900">€999</span>
                                  </div>
                                  <p className="text-sm text-amber-600 font-semibold mb-6">Save 31% • €19.98 per project</p>
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-sm font-semibold text-gray-900">50 Projects</span>
                                    </div>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">Everything Included:</p>
                                    <div className="space-y-2.5">
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
                          <div className="border-t border-gray-200 pt-8 mt-12">
                            <div className="flex flex-col items-center gap-4">
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
                              setShowPaymentModal(false)
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
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Select Payment Method</h3>
                              <div className="mb-4 flex justify-center">
                                <div className="w-full">
                                  <PayPalCheckout 
                                    planType={selectedPlan.type} 
                                    credits={selectedPlan.credits} 
                                    amount={selectedPlan.amount}
                                    onSuccess={() => {
                                      setShowPaymentModal(false)
                                      setSelectedPlan(null)
                                    }}
                                  />
                                </div>
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
                )}
              </div>
            )}

            {/* Terms and Conditions Tab */}
            {activeTab === 'terms' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Terms and Conditions</h2>
                  <p className="text-muted-foreground">Review our terms of service</p>
                </div>

                <div className="space-y-6 bg-card p-6 rounded-lg">
                  <div className="prose prose-sm max-w-none text-sm">
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-1">CutWise</h3>
                      <p className="text-muted-foreground text-xs">Last Updated: March 2026</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-base mb-2">1. Introduction</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Welcome to CutWise. These Terms and Conditions ("Terms") govern your access to and use of the CutWise web application and related services (the "Service") operated by CutWise ("Company", "we", "us", or "our").
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          By accessing or using the Service, you agree to be bound by these Terms. If you do not agree with these Terms, you must not use the Service.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">2. Description of the Service</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          CutWise is a web-based software tool designed to assist structural steel fabricators and related professionals in analysing IFC models, generating bill of materials (BOM), and producing optimized cutting plans for structural profiles.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          The Service processes data uploaded by users and generates reports and recommendations based on algorithmic calculations.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          CutWise is provided as a planning and analytical tool and does not replace professional engineering judgment, fabrication expertise, or purchasing responsibility.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">3. Eligibility</h4>
                        <p className="text-muted-foreground leading-relaxed">By using the Service, you represent that:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>You are at least 18 years old.</li>
                          <li>You are authorized to use the Service on behalf of your organization or business.</li>
                          <li>All information you provide to CutWise is accurate and complete.</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">4. Account Registration</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          To use certain features of the Service, you may be required to create an account.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">You agree to:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>Provide accurate registration information.</li>
                          <li>Maintain the security of your login credentials.</li>
                          <li>Notify us immediately of any unauthorized access to your account.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          You are responsible for all activities that occur under your account.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">5. Payment and Usage</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          CutWise may be offered on a pay-per-use basis, subscription basis, or other pricing models as specified on the platform.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">By purchasing or using paid features, you agree that:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>All fees are payable in advance.</li>
                          <li>Payments are non-refundable unless required by law.</li>
                          <li>Pricing may be updated by CutWise from time to time.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          If usage credits or project-based pricing is used, each optimization or project calculation may consume one usage unit as defined in the pricing plan.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">6. User Data and Uploaded Content</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Users may upload files including but not limited to IFC models, project data, and structural information.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">By uploading content to the Service, you confirm that:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>You have the legal right to upload and process the data.</li>
                          <li>The data does not infringe any intellectual property or confidentiality obligations.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          CutWise does not claim ownership of user-uploaded content.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          However, you grant CutWise a limited license to process, analyze, and temporarily store such data solely for the purpose of providing the Service.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">7. Data Processing</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Uploaded project data may be processed by automated algorithms to generate reports, material estimates, and optimization results.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          CutWise does not guarantee that results are error-free or suitable for every fabrication scenario.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Users remain responsible for verifying all outputs before using them in production, purchasing, or fabrication decisions.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">8. No Engineering or Professional Advice</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          CutWise is a software tool only and does not provide engineering, fabrication, or procurement advice.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">All generated outputs including:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>Bill of Materials (BOM)</li>
                          <li>Stock bar requirements</li>
                          <li>Cutting lists</li>
                          <li>Waste estimates</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">are provided for informational purposes.</p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Final responsibility for purchasing, fabrication, safety, and compliance remains with the user.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">9. Service Availability</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          While we aim to provide reliable access to the Service, CutWise does not guarantee uninterrupted availability.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">We may temporarily suspend or restrict access to the Service for:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>Maintenance</li>
                          <li>Updates</li>
                          <li>Security reasons</li>
                          <li>Technical issues</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">10. Intellectual Property</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          All intellectual property rights in the Service, including but not limited to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>software</li>
                          <li>algorithms</li>
                          <li>interface design</li>
                          <li>branding</li>
                          <li>documentation</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          are owned by CutWise or its licensors.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">You may not:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>reverse engineer the Service</li>
                          <li>copy or distribute the software</li>
                          <li>use the Service to develop competing tools</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">without written permission.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">11. Limitation of Liability</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          To the maximum extent permitted by law, CutWise shall not be liable for any:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>indirect damages</li>
                          <li>lost profits</li>
                          <li>lost contracts</li>
                          <li>project delays</li>
                          <li>fabrication errors</li>
                          <li>material purchasing errors</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          arising from the use of the Service.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          The Service is provided "as is" and "as available."
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Users assume full responsibility for verifying the accuracy and suitability of generated outputs.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">12. Indemnification</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          You agree to indemnify and hold harmless CutWise from any claims, damages, losses, or legal expenses arising from:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>your use of the Service</li>
                          <li>misuse of generated outputs</li>
                          <li>violation of these Terms.</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">13. Termination</h4>
                        <p className="text-muted-foreground leading-relaxed">We may suspend or terminate access to the Service if:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>these Terms are violated</li>
                          <li>fraudulent or abusive use is detected</li>
                          <li>required by law.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Users may stop using the Service at any time.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">14. Changes to the Terms</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          CutWise may update these Terms from time to time.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Updated Terms will be posted on the website with the revised effective date.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Continued use of the Service after updates constitutes acceptance of the revised Terms.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">15. Governing Law</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          These Terms shall be governed and interpreted according to the laws of the jurisdiction in which CutWise is registered.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Policy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Privacy Policy</h2>
                  <p className="text-muted-foreground">Review our privacy policy</p>
                </div>

                <div className="space-y-6 bg-card p-6 rounded-lg">
                  <div className="prose prose-sm max-w-none text-sm">
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-1">CutWise</h3>
                      <p className="text-muted-foreground text-xs">Last Updated: March 2026</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-base mb-2">1. Introduction</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          This Privacy Policy explains how CutWise ("we", "us", or "our") collects, uses, and protects personal information when you access or use the CutWise web application and related services (the "Service").
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          CutWise is committed to protecting your privacy and handling your information transparently and securely.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          By using the Service, you acknowledge the practices described in this Privacy Policy.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">2. Information We Collect</h4>
                        
                        <h5 className="font-semibold text-sm mb-2 mt-4">2.1 Account Information</h5>
                        <p className="text-muted-foreground leading-relaxed">When you create an account, we may collect:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>Name</li>
                          <li>Email address</li>
                          <li>Company name</li>
                          <li>Billing information</li>
                          <li>Account credentials</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          This information is used to provide access to the Service and manage user accounts.
                        </p>

                        <h5 className="font-semibold text-sm mb-2 mt-4">2.2 Project and Uploaded Data</h5>
                        <p className="text-muted-foreground leading-relaxed">Users may upload project files such as:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>IFC models</li>
                          <li>structural project data</li>
                          <li>fabrication-related information</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          This information is processed by the platform in order to generate reports, bill of materials (BOM), and cutting plans.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          We do not claim ownership of any uploaded project data.
                        </p>

                        <h5 className="font-semibold text-sm mb-2 mt-4">2.3 Technical Data</h5>
                        <p className="text-muted-foreground leading-relaxed">
                          When you access the Service, we may automatically collect technical information including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>IP address</li>
                          <li>browser type</li>
                          <li>device information</li>
                          <li>usage logs</li>
                          <li>access timestamps</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          This information helps us maintain service security and improve system performance.
                        </p>

                        <h5 className="font-semibold text-sm mb-2 mt-4">2.4 Payment Information</h5>
                        <p className="text-muted-foreground leading-relaxed">
                          If you purchase paid features, payments may be processed through third-party payment providers.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          CutWise does not store full credit card details. Payment information is handled securely by the payment processor.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">3. How We Use Your Information</h4>
                        <p className="text-muted-foreground leading-relaxed">We use collected information to:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>Provide and operate the Service</li>
                          <li>Process uploaded project files</li>
                          <li>Generate optimization reports and results</li>
                          <li>Manage user accounts</li>
                          <li>Process payments</li>
                          <li>Provide customer support</li>
                          <li>Improve system functionality and reliability</li>
                          <li>Maintain platform security</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          We do not sell personal information to third parties.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">4. Data Storage and Security</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          We take reasonable technical and organizational measures to protect user information from:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>unauthorized access</li>
                          <li>data loss</li>
                          <li>misuse</li>
                          <li>alteration</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Project files and related data are stored only for as long as necessary to provide the Service or as required for operational purposes.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">5. Data Retention</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          CutWise retains personal and project data only as long as necessary for:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>providing the Service</li>
                          <li>maintaining user accounts</li>
                          <li>complying with legal obligations</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Users may request deletion of their data as described in Section 9.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">6. Sharing of Information</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          We may share information with trusted third-party service providers that help us operate the platform, such as:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>cloud hosting providers</li>
                          <li>payment processors</li>
                          <li>analytics tools</li>
                          <li>customer support systems</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          These providers process information only on our behalf and under confidentiality obligations.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          We do not sell or rent personal information.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">7. International Data Transfers</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          If you access CutWise from outside the country where our servers are located, your information may be transferred and processed internationally.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          We take appropriate measures to ensure that data protection standards are maintained.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">8. Cookies and Analytics</h4>
                        <p className="text-muted-foreground leading-relaxed">CutWise may use cookies or similar technologies to:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>maintain user sessions</li>
                          <li>remember preferences</li>
                          <li>analyze platform usage</li>
                          <li>improve user experience</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Users can control cookies through their browser settings.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">9. Your Data Protection Rights</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Depending on your jurisdiction, you may have the right to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          <li>access your personal data</li>
                          <li>request correction of inaccurate information</li>
                          <li>request deletion of your data</li>
                          <li>restrict certain types of processing</li>
                          <li>request a copy of your data</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Requests can be submitted by contacting us using the information in Section 12.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">10. Children's Privacy</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          CutWise is intended for professional use by businesses and is not directed toward individuals under the age of 18.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          We do not knowingly collect personal data from children.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-2">11. Changes to This Privacy Policy</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          We may update this Privacy Policy periodically.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          When updates occur, the revised version will be posted on the website with an updated "Last Updated" date.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Continued use of the Service after changes indicates acceptance of the revised policy.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <Footer />
    </div>
  )
}

export default Settings
