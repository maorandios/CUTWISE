import React from 'react'
import { SelectionMode, ClipPlaneKey, MarkupTool, MarkupColor } from '../types'
import { getColorHex, getLineWidth } from '../utils'

interface ControlPanelProps {
  // Visibility
  visible: boolean
  
  // Selection mode
  selectionMode: SelectionMode
  onSelectionModeChange: (mode: SelectionMode) => void
  
  // Measurement
  enableMeasurement?: boolean
  measurementMode: boolean
  onToggleMeasurement: () => void
  onClearAllMeasurements: () => void
  
  // Clipping
  enableClipping?: boolean
  clippingMode: boolean
  activeClipPlane: ClipPlaneKey | null
  clipAmount: number
  onToggleClipping: () => void
  onSelectClipPlane: (plane: ClipPlaneKey) => void
  onClipAmountChange: (amount: number) => void
  
  // Markup
  markupMode: boolean
  activeMarkupTool: MarkupTool | null
  markupColor: MarkupColor
  markupThickness: number
  onToggleMarkup: () => void
  onSetMarkupTool: (tool: MarkupTool | null) => void
  onSetMarkupColor: (color: MarkupColor) => void
  onSetMarkupThickness: (thickness: number) => void
  onClearAllMarkups: () => void
  
  // Screenshot
  onSaveScreenshot: () => void
  onCopyScreenshot: () => void
  
  // Visibility controls
  selectedCount: number
  onTransparent: () => void
  onHide: () => void
  onHideAllExcept: () => void
  onShowAll: () => void
  
  // Layer toggles
  platesVisible: boolean
  boltsVisible: boolean
  onTogglePlates: () => void
  onToggleBolts: () => void
  platesLoading?: boolean
  boltsLoading?: boolean
}

export function ControlPanel({
  visible,
  selectionMode,
  onSelectionModeChange,
  enableMeasurement = false,
  measurementMode,
  onToggleMeasurement,
  onClearAllMeasurements,
  enableClipping = false,
  clippingMode,
  activeClipPlane,
  clipAmount,
  onToggleClipping,
  onSelectClipPlane,
  onClipAmountChange,
  markupMode,
  activeMarkupTool,
  markupColor,
  markupThickness,
  onToggleMarkup,
  onSetMarkupTool,
  onSetMarkupColor,
  onSetMarkupThickness,
  onClearAllMarkups,
  onSaveScreenshot,
  onCopyScreenshot,
  selectedCount,
  onTransparent,
  onHide,
  onHideAllExcept,
  onShowAll,
  platesVisible,
  boltsVisible,
  onTogglePlates,
  onToggleBolts,
  platesLoading = false,
  boltsLoading = false
}: ControlPanelProps) {
  if (!visible) return null

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-3 flex gap-2">
        {/* Parts and Assemblies mode buttons */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onSelectionModeChange('parts')
          }}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            selectionMode === 'parts'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title="Select individual parts"
        >
          Parts
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onSelectionModeChange('assemblies')
          }}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            selectionMode === 'assemblies'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title="Select assemblies"
        >
          Assemblies
        </button>
        
        {/* Divider */}
        <div className="border-l border-gray-300 mx-1"></div>
        
        {/* Layer toggles */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onTogglePlates()
          }}
          disabled={platesLoading}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            platesVisible
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } ${platesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Toggle plates visibility"
        >
          {platesLoading ? '⏳ Loading...' : platesVisible ? '✓ Plates' : 'Plates'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onToggleBolts()
          }}
          disabled={boltsLoading}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            boltsVisible
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } ${boltsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Toggle bolts visibility"
        >
          {boltsLoading ? '⏳ Loading...' : boltsVisible ? '✓ Bolts' : 'Bolts'}
        </button>
        
        {/* Divider */}
        <div className="border-l border-gray-300 mx-1"></div>
        
        {/* Measurement button - only show if feature is enabled */}
        {enableMeasurement && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onToggleMeasurement()
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              measurementMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
            title="Measure distance between two points"
          >
            📏 Measure
          </button>
        )}
        {enableMeasurement && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onClearAllMeasurements()
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors"
            title="Clear all measurements"
          >
            🗑️ Clear Measurements
          </button>
        )}
        
        {/* Clipping controls */}
        {enableClipping && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onToggleClipping()
              }}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                clippingMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
              title="Enable/disable clipping planes"
            >
              ✂️ Clip
            </button>
            
            {clippingMode && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">
                  {(['top', 'bottom', 'left', 'right', 'front', 'back'] as ClipPlaneKey[]).map(planeKey => (
                    <button
                      key={planeKey}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onSelectClipPlane(planeKey)
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        activeClipPlane === planeKey
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-200'
                      }`}
                      title={`Clip from ${planeKey}`}
                    >
                      {planeKey.toUpperCase()}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span>Depth</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(clipAmount * 100)}
                    onChange={(e) => onClipAmountChange(parseInt(e.target.value, 10) / 100)}
                    className="w-32"
                  />
                  <span className="w-12 text-right">{Math.round(clipAmount * 100)}%</span>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Markup button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onToggleMarkup()
          }}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            markupMode
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
          title="Markup - capture screenshot"
        >
          📸 MarkUp
        </button>
        
        {markupMode && (
          <>
            {/* Markup Tools */}
            <div className="flex gap-1 border-r pr-2 mr-2 border-gray-300">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onSetMarkupTool(activeMarkupTool === 'pencil' ? null : 'pencil')
                }}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeMarkupTool === 'pencil'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Draw freehand"
              >
                ✏️ Pencil
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onSetMarkupTool(activeMarkupTool === 'arrow' ? null : 'arrow')
                }}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeMarkupTool === 'arrow'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Draw arrow"
              >
                ➡️ Arrow
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onSetMarkupTool(activeMarkupTool === 'cloud' ? null : 'cloud')
                }}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeMarkupTool === 'cloud'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Draw cloud shape"
              >
                ☁️ Cloud
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onSetMarkupTool(activeMarkupTool === 'text' ? null : 'text')
                }}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeMarkupTool === 'text'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Add text"
              >
                📝 Text
              </button>
            </div>
            
            {/* Clear Markup button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onClearAllMarkups()
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors"
              title="Clear all markups from the view"
            >
              🗑️ Clear
            </button>
            
            {/* Markup Settings Panel - shows when pencil, arrow, or cloud is selected */}
            {(activeMarkupTool === 'pencil' || activeMarkupTool === 'arrow' || activeMarkupTool === 'cloud') && (
              <div className="flex gap-2 items-center border-r pr-2 mr-2 border-gray-300 bg-gray-50 px-3 py-2 rounded">
                {/* Color Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Color:</span>
                  <div className="flex gap-1">
                    {(['red', 'black', 'yellow', 'green', 'blue'] as const).map((color) => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          onSetMarkupColor(color)
                        }}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          markupColor === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{
                          backgroundColor: getColorHex(color),
                          boxShadow: markupColor === color ? '0 0 0 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Thickness Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Thickness:</span>
                  <div className="flex gap-1 items-center">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const width = getLineWidth(level)
                      return (
                        <button
                          key={level}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onSetMarkupThickness(level)
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            markupThickness === level
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Level ${level} (${width}px)`}
                        >
                          <div
                            className="mx-auto"
                            style={{
                              width: `${width * 2}px`,
                              height: '2px',
                              backgroundColor: markupThickness === level ? 'white' : '#666',
                              borderRadius: '1px'
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Save/Copy Screenshot buttons - always available */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onSaveScreenshot()
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors"
          title="Save screenshot as PNG"
        >
          💾 Save
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onCopyScreenshot()
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-medium transition-colors"
          title="Copy screenshot to clipboard"
        >
          📋 Copy
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onTransparent()
          }}
          disabled={selectedCount === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          title="Make selected element(s) transparent"
        >
          Transparent
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onHide()
          }}
          disabled={selectedCount === 0}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          title="Hide selected element(s)"
        >
          Hide
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onHideAllExcept()
          }}
          disabled={selectedCount === 0}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          title="Hide all elements except selected"
        >
          Hide All Except
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onShowAll()
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-medium transition-colors"
          title="Show all elements and reset all states"
        >
          Show All
        </button>
      </div>
    </div>
  )
}

