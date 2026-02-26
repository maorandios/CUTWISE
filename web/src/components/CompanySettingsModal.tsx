import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompanyDetails {
  companyName: string
  address: string
  country: string
  phoneNumber: string
  companySize: '1' | '1-10' | '10-50' | '50-300' | '300+' | ''
}

interface CompanySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (details: CompanyDetails) => void
  currentDetails: CompanyDetails
}

const CompanySettingsModal = ({ isOpen, onClose, onSave, currentDetails }: CompanySettingsModalProps) => {
  const [details, setDetails] = useState<CompanyDetails>(currentDetails)
  const [error, setError] = useState('')

  useEffect(() => {
    setDetails(currentDetails)
  }, [currentDetails, isOpen])

  const handleSave = () => {
    if (!details.companyName.trim()) {
      setError('Company name is required')
      return
    }
    
    setError('')
    onSave(details)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Company Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              type="text"
              value={details.companyName}
              onChange={(e) => setDetails({ ...details, companyName: e.target.value })}
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
              value={details.address}
              onChange={(e) => setDetails({ ...details, address: e.target.value })}
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
              value={details.country}
              onChange={(e) => setDetails({ ...details, country: e.target.value })}
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
              value={details.phoneNumber}
              onChange={(e) => setDetails({ ...details, phoneNumber: e.target.value })}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companySize">
              Company Size <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Select
              value={details.companySize}
              onValueChange={(value) => setDetails({ ...details, companySize: value as CompanyDetails['companySize'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Just me (1)</SelectItem>
                <SelectItem value="1-10">Small team (1-10)</SelectItem>
                <SelectItem value="10-50">Medium (10-50)</SelectItem>
                <SelectItem value="50-300">Large (50-300)</SelectItem>
                <SelectItem value="300+">Enterprise (300+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CompanySettingsModal
