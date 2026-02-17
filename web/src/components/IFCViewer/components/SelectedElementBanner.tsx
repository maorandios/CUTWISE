import React from 'react'

interface SelectedElementBannerProps {
  visible: boolean
  elementType: string
  expressID: number
}

export function SelectedElementBanner({ visible, elementType, expressID }: SelectedElementBannerProps) {
  if (!visible) return null

  return (
    <div className="p-2 bg-gray-100 border-b text-sm text-gray-600">
      Selected: {elementType} (ID: {expressID})
    </div>
  )
}

