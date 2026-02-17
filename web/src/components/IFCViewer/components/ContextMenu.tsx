import React from 'react'
import { ContextMenuState, ElementData, SelectionMode } from '../types'

interface ContextMenuProps {
  contextMenu: ContextMenuState
  elementData: ElementData
  selectionMode: SelectionMode
  onClose: () => void
}

export function ContextMenu({ contextMenu, elementData, selectionMode, onClose }: ContextMenuProps) {
  if (!contextMenu.visible) return null

  // Helper function to find property value across all property sets
  const findPropertyValue = (keyName: string): string | null => {
    if (!elementData.data || !elementData.data.property_sets) return null
    
    // Search through all property sets (case-insensitive)
    for (const [_psetName, props] of Object.entries(elementData.data.property_sets)) {
      const propsObj = props as Record<string, any>
      // Try exact match first
      if (propsObj[keyName] !== undefined && propsObj[keyName] !== null) {
        return String(propsObj[keyName])
      }
      // Try case-insensitive match
      const foundKey = Object.keys(propsObj).find(
        k => k.toLowerCase() === keyName.toLowerCase()
      )
      if (foundKey && propsObj[foundKey] !== undefined && propsObj[foundKey] !== null) {
        return String(propsObj[foundKey])
      }
    }
    return null
  }

  return (
    <>
      {/* Backdrop to close menu on click outside */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200/50 min-w-[400px] max-w-[600px] max-h-[700px] overflow-hidden backdrop-blur-sm flex flex-col"
        style={{
          left: `${Math.min(contextMenu.x, window.innerWidth - 420)}px`,
          top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
          transform: 'translate(-10px, -10px)',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 px-5 py-3.5 border-b border-blue-800/30">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
            <h3 className="text-white font-semibold text-sm tracking-wide uppercase">Part Info</h3>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-5 max-h-[600px] overflow-y-auto">
          {elementData.loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading...</span>
            </div>
          ) : elementData.error ? (
            <div className="text-red-500 text-sm">
              Error: {elementData.error}
            </div>
          ) : elementData.data ? (
            <div className="space-y-4">
              {selectionMode === 'parts' ? (
                <>
                  {/* 1. Basic Attributes - Parts Mode */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Basic Attributes</h4>
                    <div className="space-y-2">
                      {/* Name */}
                      {elementData.data.basic_attributes?.Name && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-gray-500 font-medium min-w-[120px]">Name:</span>
                          <span className="text-gray-900 break-words">{String(elementData.data.basic_attributes.Name)}</span>
                        </div>
                      )}
                      {/* Description */}
                      {elementData.data.basic_attributes?.Description && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-gray-500 font-medium min-w-[120px]">Description:</span>
                          <span className="text-gray-900 break-words">{String(elementData.data.basic_attributes.Description)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Assembly Mode - Show all assembly data */}
                  {/* 1. Basic Attributes - Assembly Mode */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Basic Attributes</h4>
                    <div className="space-y-2">
                      {/* Name */}
                      {elementData.data.basic_attributes?.Name && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-gray-500 font-medium min-w-[120px]">Name:</span>
                          <span className="text-gray-900 break-words">{String(elementData.data.basic_attributes.Name)}</span>
                        </div>
                      )}
                      {/* Tag */}
                      {elementData.data.basic_attributes?.Tag && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-gray-500 font-medium min-w-[120px]">Tag:</span>
                          <span className="text-gray-900 break-words">{String(elementData.data.basic_attributes.Tag)}</span>
                        </div>
                      )}
                      {/* Description */}
                      {elementData.data.basic_attributes?.Description && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-gray-500 font-medium min-w-[120px]">Description:</span>
                          <span className="text-gray-900 break-words">{String(elementData.data.basic_attributes.Description)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assembly Parts */}
                  {elementData.data.relationships?.parts && elementData.data.relationships.parts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Parts ({elementData.data.relationships.parts.length})</h4>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {elementData.data.relationships.parts.map((part: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                            <div className="font-medium text-gray-700">{part.type}</div>
                            {part.tag && <div className="text-gray-600">Tag: {part.tag}</div>}
                            {part.name && <div className="text-gray-600">Name: {part.name}</div>}
                            <div className="text-gray-500">ID: {part.id}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 2. Property Sets */}
              {selectionMode === 'parts' ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Property Sets</h4>
                  <div className="space-y-2">
                    {/* Bottom elevation */}
                    {findPropertyValue('Bottom elevation') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Bottom elevation:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Bottom elevation')} <span className="text-gray-400">m</span></span>
                      </div>
                    )}
                    {/* Top elevation */}
                    {findPropertyValue('Top elevation') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Top elevation:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Top elevation')} <span className="text-gray-400">m</span></span>
                      </div>
                    )}
                    {/* Phase */}
                    {findPropertyValue('Phase') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Phase:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Phase')}</span>
                      </div>
                    )}
                    {/* Weight */}
                    {findPropertyValue('Weight') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Weight:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Weight')} <span className="text-gray-400">kg</span></span>
                      </div>
                    )}
                    {/* Height */}
                    {findPropertyValue('Height') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Height:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Height')} <span className="text-gray-400">mm</span></span>
                      </div>
                    )}
                    {/* Width */}
                    {findPropertyValue('Width') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Width:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Width')} <span className="text-gray-400">mm</span></span>
                      </div>
                    )}
                    {/* Length */}
                    {findPropertyValue('Length') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Length:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Length')} <span className="text-gray-400">mm</span></span>
                      </div>
                    )}
                    {/* Reference */}
                    {findPropertyValue('Reference') && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 font-medium min-w-[120px]">Reference:</span>
                        <span className="text-gray-900 break-words">{findPropertyValue('Reference')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Assembly Mode - Show all property sets */
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Property Sets</h4>
                  {Object.keys(elementData.data.property_sets || {}).length > 0 ? (
                    Object.entries(elementData.data.property_sets).map(([psetName, props]) => (
                      <div key={psetName} className="space-y-1.5 bg-gray-50 p-2 rounded">
                        <div className="text-xs font-semibold text-blue-600">{psetName}</div>
                        <div className="space-y-1">
                          {Object.entries(props as Record<string, any>).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2 text-xs pl-2">
                              <span className="text-gray-600 font-medium min-w-[100px] break-words">{key}:</span>
                              <span className="text-gray-900 break-words">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-xs italic">No property sets available</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-sm italic">
              No data available
            </div>
          )}
        </div>
      </div>
    </>
  )
}

