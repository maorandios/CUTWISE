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

interface CompanyDetails {
  companyName: string
  address: string
  country: string
  phoneNumber: string
  companySize: '1' | '1-10' | '10-50' | '50-300' | '300+' | ''
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [generalDetails, setGeneralDetails] = useState<CompanyDetails>(companyDetails)

  // Account tab state
  const [email, setEmail] = useState('user@example.com')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Technical tab state
  const [technicalSettings, setTechnicalSettings] = useState<NestingSettings>(
    nestingSettings || {
      kerf: 3.0,
      trim: 5.0,
      stockToleranceEnabled: true,
      stockToleranceValue: 20.0,
      stockLengths: [
        { id: 1, value: 6000 },
        { id: 2, value: 12000 }
      ]
    }
  )
  const [nextStockId, setNextStockId] = useState<number>(3)

  useEffect(() => {
    setGeneralDetails(companyDetails)
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
          stockToleranceValue: settings.tolerance || 20.0,
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

  const handleSaveGeneral = () => {
    if (!generalDetails.companyName.trim()) {
      toast.error('Company name is required')
      return
    }
    
    onSaveCompanyDetails(generalDetails)
    toast.success('General settings saved successfully!')
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
        <div className="w-full max-w-[1440px] flex bg-background">
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
                  <div className="space-y-2">
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

                  <div className="space-y-2">
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

                  <div className="space-y-2">
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

                  <div className="space-y-2">
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

                  <div className="space-y-2">
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

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onBack}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveGeneral}>
                    Save Changes
                  </Button>
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
                  <div className="space-y-2">
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

                  <div className="border-t border-border pt-6 mt-6">
                    <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                    
                    <div className="space-y-4">
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
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onBack}>
                    Cancel
                  </Button>
                  <Button onClick={() => console.log('Save account settings')}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}

            {/* Technical Tab */}
            {activeTab === 'technical' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Technical Settings</h2>
                  <p className="text-muted-foreground">Configure default nesting generation parameters</p>
                </div>

                <div className="space-y-6 bg-card p-6 rounded-lg">
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
                    <Label>Stock Lengths (mm) - Up to 5</Label>
                    <div className="space-y-3">
                      {technicalSettings.stockLengths.map((stock, index) => (
                        <div key={stock.id} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground font-medium w-8">{index + 1}.</span>
                          <Input
                            type="number"
                            min="1000"
                            max="20000"
                            step="100"
                            value={stock.value}
                            onChange={(e) => {
                              const val = e.target.value
                              const parsedVal = val === '' ? 0 : parseFloat(val)
                              const newStockLengths = technicalSettings.stockLengths.map(s => 
                                s.id === stock.id ? {...s, value: parsedVal} : s
                              )
                              setTechnicalSettings({ ...technicalSettings, stockLengths: newStockLengths })
                            }}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">mm</span>
                          <span className="text-sm text-muted-foreground">({(stock.value / 1000).toFixed(1)}m)</span>
                          {technicalSettings.stockLengths.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newStockLengths = technicalSettings.stockLengths.filter(s => s.id !== stock.id)
                                setTechnicalSettings({ ...technicalSettings, stockLengths: newStockLengths })
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      {technicalSettings.stockLengths.length < 5 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTechnicalSettings({
                              ...technicalSettings,
                              stockLengths: [...technicalSettings.stockLengths, { id: nextStockId, value: 6000 }]
                            })
                            setNextStockId(nextStockId + 1)
                          }}
                          className="mt-3"
                        >
                          + Add Stock Length
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Common lengths: 6000mm (6m), 12000mm (12m)
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onBack}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTechnical}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}

            {/* Billing and Usage Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Billing and Usage</h2>
                  <p className="text-muted-foreground">Manage your billing and usage information</p>
                </div>

                <div className="space-y-6 bg-card p-6 rounded-lg">
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
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
