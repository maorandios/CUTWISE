import React from 'react'
import { MarkupTool } from '../types'

interface MarkupCanvasProps {
  visible: boolean
  activeMarkupTool: MarkupTool | null
  canvasRef: React.RefObject<HTMLCanvasElement>
  containerRef: React.RefObject<HTMLDivElement>
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void
}

export function MarkupCanvas({
  visible,
  activeMarkupTool,
  canvasRef,
  containerRef,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: MarkupCanvasProps) {
  if (!visible) return null

  const getCursor = () => {
    if (activeMarkupTool === 'pencil' || activeMarkupTool === 'arrow' || activeMarkupTool === 'cloud') {
      return 'crosshair'
    }
    return 'default'
  }

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ pointerEvents: activeMarkupTool ? 'auto' : 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: getCursor() }}
      />
    </div>
  )
}

