import React from 'react'
import { Document, Page, Text, View, StyleSheet, Svg, Line, Polygon, Image, Path } from '@react-pdf/renderer'
import { NestingReport as NestingReportType, SteelReport, CuttingPattern } from '../types'

interface CuttingPlanPDFProps {
  nestingReport: NestingReportType
  report: SteelReport | null
  projectName?: string
  svgImages?: { [key: string]: string }
}

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
    borderBottomStyle: 'solid',
  },
  tableHeader: {
    backgroundColor: '#4a5568',
    color: '#ffffff',
  },
  tableCell: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
    borderRightStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
  },
  tableCellHeader: {
    fontWeight: 'bold',
  },
  textRight: {
    textAlign: 'right',
  },
  patternSection: {
    marginBottom: 10,
    pageBreakInside: 'avoid',
  },
  stockBarContainer: {
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  footerDivider: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    borderTopStyle: 'solid',
    marginTop: 10,
    marginBottom: 10,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    left: 30,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
  },
  footerTextBold: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerDot: {
    fontSize: 8,
    color: '#6b7280',
    marginHorizontal: 6,
  },
})

const formatLength = (mm: number) => {
  if (mm >= 1000) {
    return `${(mm / 1000).toFixed(2)}m`
  }
  return `${mm.toFixed(0)}mm`
}

// StockBarVisualization - Matches app exactly
const StockBarVisualization: React.FC<{ pattern: CuttingPattern; profileName: string }> = ({ pattern, profileName }) => {
  const appWidth = 1000
  const appHeight = 60
  const pdfWidth = 782
  const pdfHeight = 50
  const widthScale = pdfWidth / appWidth
  const heightScale = pdfHeight / appHeight
  
  const stockLength = pattern.stock_length
  const pxPerMm = appWidth / stockLength
  const sortedParts = [...(pattern.parts || [])]
  
  const totalPartsLengthMm = sortedParts.reduce(
    (sum, part) => sum + (part.length || 0),
    0
  )
  
  const wasteMm = pattern.waste || 0
  
  // Position parts without kerf gaps - gaps are visual only and shouldn't affect positioning
  // Parts are positioned flush against each other based on their actual lengths
  // This matches the app's positioning exactly
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
  const exactPartsEndPx = partPositions.length > 0 ? Math.floor(partPositions[lastPartIdx].xEnd) : 0
  
  const partNameToNumber = new Map<string, number>()
  const partGroups = new Map<string, { name: string, length: number, count: number }>()
  
  pattern.parts.forEach((part) => {
    const partData = part?.part || {}
    const partName = partData.reference || partData.element_name || 'Unknown'
    const partLength = part?.length || 0
    
    if (partGroups.has(partName)) {
      partGroups.get(partName)!.count += 1
    } else {
      partGroups.set(partName, { name: partName, length: partLength, count: 1 })
    }
  })
  
  const sortedGroups = Array.from(partGroups.values()).sort((a, b) => b.length - a.length)
  sortedGroups.forEach((group, idx) => {
    partNameToNumber.set(group.name, idx + 1)
  })
  
  interface PartEnd {
    type: 'straight' | 'miter'
    rawAngle: number | null
    deviation: number | null
  }
  
  const parseAngle = (value: any): number | null => {
    if (value === null || value === undefined) return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string') {
      const match = value.match(/-?\d+(\.\d+)?/)
      if (match) {
        const n = parseFloat(match[0])
        return Number.isFinite(n) ? n : null
      }
    }
    return null
  }
  
  const analyzeAngle = (rawAngle: number | null): { deviation: number | null, isSlope: boolean } => {
    if (rawAngle === null) return { deviation: null, isSlope: false }
    
    const absAngle = Math.abs(rawAngle)
    const NEAR_STRAIGHT_THRESHOLD = 1.0
    const MIN_DEV_DEG = 1.0
    
    let convention: 'ABS' | 'DEV'
    let deviation: number
    
    if (absAngle >= 60 && absAngle <= 120) {
      convention = 'ABS'
      deviation = Math.abs(rawAngle - 90)
    } else {
      convention = 'DEV'
      deviation = absAngle
    }
    
    let isSlope = false
    if (convention === 'ABS' && deviation < NEAR_STRAIGHT_THRESHOLD) {
      isSlope = false
    } else if (convention === 'DEV' && deviation < NEAR_STRAIGHT_THRESHOLD) {
      isSlope = false
    } else {
      isSlope = deviation >= MIN_DEV_DEG
    }
    
    return { deviation, isSlope }
  }
  
  const partEnds = partPositions.map(({ part }) => {
    const slopeInfo = (part as any).slope_info || {}
    const startHasSlope = slopeInfo.start_has_slope === true
    const endHasSlope = slopeInfo.end_has_slope === true
    const startRawAngle = parseAngle(slopeInfo.start_angle)
    const endRawAngle = parseAngle(slopeInfo.end_angle)
    
    const startAnalysis = analyzeAngle(startRawAngle)
    const endAnalysis = analyzeAngle(endRawAngle)
    
    const startDev = startHasSlope && startAnalysis.deviation !== null 
      ? startAnalysis.deviation 
      : (startAnalysis.isSlope ? startAnalysis.deviation || 0 : 0)
    const endDev = endHasSlope && endAnalysis.deviation !== null 
      ? endAnalysis.deviation 
      : (endAnalysis.isSlope ? endAnalysis.deviation || 0 : 0)
    
    const startCut: PartEnd = {
      type: startHasSlope ? 'miter' : 'straight',
      rawAngle: startRawAngle,
      deviation: startDev
    }
    
    const endCut: PartEnd = {
      type: endHasSlope ? 'miter' : 'straight',
      rawAngle: endRawAngle,
      deviation: endDev
    }
    
    return { startCut, endCut }
  })
  
  const partFlipStates: boolean[] = new Array(numParts).fill(false)
  
  if (numParts > 0) {
    const firstPart = partEnds[0]
    if (firstPart) {
      const startDev = firstPart.startCut.deviation || 0
      const endDev = firstPart.endCut.deviation || 0
      
      if (firstPart.endCut.type === 'straight' && firstPart.startCut.type === 'miter') {
        partFlipStates[0] = true
      }
      else if (firstPart.startCut.type === 'miter' && firstPart.endCut.type === 'miter') {
        if (endDev < startDev && endDev < 5.0) {
          partFlipStates[0] = true
        }
      }
      else if (firstPart.endCut.type === 'miter' && endDev < 1.0 && firstPart.startCut.type === 'miter' && startDev > 5.0) {
        partFlipStates[0] = true
      }
    }
  }
  
  const ANGLE_MATCH_TOL = 2.0
  const NEAR_STRAIGHT_THRESHOLD = 1.0
  
  for (let i = 1; i < numParts; i++) {
    const prevPart = partEnds[i - 1]
    const currPart = partEnds[i]
    
    if (!prevPart || !currPart) {
      continue
    }
    
    const prevEndType = partFlipStates[i - 1] ? prevPart.startCut.type : prevPart.endCut.type
    const prevEndDev = partFlipStates[i - 1] ? prevPart.startCut.deviation || 0 : prevPart.endCut.deviation || 0
    
    const currStartTypeNormal = currPart.startCut.type
    const currStartDevNormal = currPart.startCut.deviation || 0
    const currStartTypeFlipped = currPart.endCut.type
    const currStartDevFlipped = currPart.endCut.deviation || 0
    
    let normalIsShared = false
    let flippedIsShared = false
    
    if (prevEndType === 'straight' && currStartTypeNormal === 'straight') {
      normalIsShared = true
    } else if (prevEndType === 'miter' && currStartTypeNormal === 'miter') {
      const devDiff = Math.abs(prevEndDev - currStartDevNormal)
      normalIsShared = devDiff <= ANGLE_MATCH_TOL
    } else {
      const bothNearStraight = 
        (prevEndDev < NEAR_STRAIGHT_THRESHOLD) && 
        (currStartDevNormal < NEAR_STRAIGHT_THRESHOLD)
      normalIsShared = bothNearStraight || true
    }
    
    if (prevEndType === 'straight' && currStartTypeFlipped === 'straight') {
      flippedIsShared = true
    } else if (prevEndType === 'miter' && currStartTypeFlipped === 'miter') {
      const devDiff = Math.abs(prevEndDev - currStartDevFlipped)
      flippedIsShared = devDiff <= ANGLE_MATCH_TOL
    } else {
      const bothNearStraight = 
        (prevEndDev < NEAR_STRAIGHT_THRESHOLD) && 
        (currStartDevFlipped < NEAR_STRAIGHT_THRESHOLD)
      flippedIsShared = bothNearStraight || true
    }
    
    const normalIsBetterMatch = (prevEndType === currStartTypeNormal) && normalIsShared
    const flippedIsBetterMatch = (prevEndType === currStartTypeFlipped) && flippedIsShared
    
    if (flippedIsBetterMatch && !normalIsBetterMatch) {
      partFlipStates[i] = true
    }
  }
  
  const sharedBoundaries: Array<{ 
    x: number, 
    leftPartIdx: number, 
    rightPartIdx: number, 
    leftEndType: string, 
    rightStartType: string, 
    leftDev: number, 
    rightDev: number 
  }> = []
  
  const NEAR_STRAIGHT_THRESHOLD_FOR_SHARING = 1.0
  
  for (let i = 0; i < numParts - 1; i++) {
    const leftPartIdx = i
    const rightPartIdx = i + 1
    
    const leftPartEnd = partEnds[leftPartIdx]
    const rightPartEnd = partEnds[rightPartIdx]
    
    if (!leftPartEnd || !rightPartEnd) {
      continue
    }
    
    const leftEndType = partFlipStates[leftPartIdx] ? leftPartEnd.startCut.type : leftPartEnd.endCut.type
    const rightStartType = partFlipStates[rightPartIdx] ? rightPartEnd.endCut.type : rightPartEnd.startCut.type
    const leftDev = partFlipStates[leftPartIdx] ? leftPartEnd.startCut.deviation || 0 : leftPartEnd.endCut.deviation || 0
    const rightDev = partFlipStates[rightPartIdx] ? rightPartEnd.endCut.deviation || 0 : rightPartEnd.startCut.deviation || 0
    
    const rightPartXStart = partPositions[rightPartIdx].xStart
    const boundaryX = rightPartIdx === 0 ? 0 : Math.floor(rightPartXStart)
    
    let isShared = false
    
    if (leftEndType === 'straight' && rightStartType === 'straight') {
      isShared = true
    } else if (leftEndType === 'miter' && rightStartType === 'miter') {
      const devDiff = Math.abs(leftDev - rightDev)
      isShared = devDiff <= ANGLE_MATCH_TOL
    } else {
      // Mixed types (one straight, one miter)
      // Only share if both are very close to straight
      const bothNearStraight = 
        (leftDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING) && 
        (rightDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING)
      
      isShared = bothNearStraight
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
  
  const boundaryMap = new Map<number, { ownerSide: 'left' | 'right' }>()
  
  sharedBoundaries.forEach(sb => {
    if (sb.leftEndType === 'miter' && sb.rightStartType === 'miter') {
      const devDiff = Math.abs(sb.leftDev - sb.rightDev)
      let ownerSide: 'left' | 'right'
      
      if (devDiff <= ANGLE_MATCH_TOL) {
        ownerSide = 'left'
      } else {
        if (sb.leftDev > sb.rightDev) {
          ownerSide = 'left'
        } else if (sb.rightDev > sb.leftDev) {
          ownerSide = 'right'
        } else {
          ownerSide = 'left'
        }
      }
      
      boundaryMap.set(sb.x, { ownerSide })
    }
  })
  
  const clipLineToBounds = (
    x1: number, y1: number, x2: number, y2: number,
    minX: number, minY: number, maxX: number, maxY: number
  ): { x1: number, y1: number, x2: number, y2: number, visible: boolean } => {
    const dx = x2 - x1
    const dy = y2 - y1
    
    if (Math.abs(dx) < 0.001) {
      if (x1 < minX || x1 > maxX) return { x1: 0, y1: 0, x2: 0, y2: 0, visible: false }
      return {
        x1,
        y1: Math.max(minY, Math.min(y1, maxY)),
        x2,
        y2: Math.max(minY, Math.min(y2, maxY)),
        visible: true
      }
    }
    
    if (Math.abs(dy) < 0.001) {
      if (y1 < minY || y1 > maxY) return { x1: 0, y1: 0, x2: 0, y2: 0, visible: false }
      return {
        x1: Math.max(minX, Math.min(x1, maxX)),
        y1,
        x2: Math.max(minX, Math.min(x2, maxX)),
        y2,
        visible: true
      }
    }
    
    const slope = dy / dx
    const intercept = y1 - slope * x1
    
    const points: Array<{ x: number, y: number, t: number }> = []
    
    const edges = [
      { x: minX, y: slope * minX + intercept, isX: true },
      { x: maxX, y: slope * maxX + intercept, isX: true },
      { x: (minY - intercept) / slope, y: minY, isX: false },
      { x: (maxY - intercept) / slope, y: maxY, isX: false }
    ]
    
    edges.forEach(edge => {
      if (edge.isX) {
        if (edge.y >= minY && edge.y <= maxY) {
          const t = (edge.x - x1) / dx
          if (t >= 0 && t <= 1) {
            points.push({ x: edge.x, y: edge.y, t })
          }
        }
      } else {
        if (edge.x >= minX && edge.x <= maxX) {
          const t = (edge.x - x1) / dx
          if (t >= 0 && t <= 1) {
            points.push({ x: edge.x, y: edge.y, t })
          }
        }
      }
    })
    
    if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) {
      points.push({ x: x1, y: y1, t: 0 })
    }
    if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) {
      points.push({ x: x2, y: y2, t: 1 })
    }
    
    if (points.length < 2) {
      return { x1: 0, y1: 0, x2: 0, y2: 0, visible: false }
    }
    
    points.sort((a, b) => a.t - b.t)
    return {
      x1: points[0].x,
      y1: points[0].y,
      x2: points[points.length - 1].x,
      y2: points[points.length - 1].y,
      visible: true
    }
  }
  
  const sharedBoundarySet = new Set<number>()
  sharedBoundaries.forEach(sb => {
    sharedBoundarySet.add(sb.x)
  })
  
  const wasteWidth = pattern.waste > 0 ? (pattern.waste * pxPerMm) : 0
  
  const borderInset = 1
  const contentPadding = 1
  const contentWidth = pdfWidth - 2 * borderInset - contentPadding
  const contentHeight = pdfHeight - 2 * borderInset - contentPadding
  
  return (
    <View style={styles.stockBarContainer}>
      <View style={{
        position: 'relative',
        height: pdfHeight,
        width: pdfWidth,
        marginBottom: 5,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderStyle: 'solid',
        backgroundColor: '#ffffff',
      }}>
        <View style={{
          position: 'absolute',
          left: borderInset,
          top: borderInset,
          width: contentWidth + contentPadding,
          height: contentHeight + contentPadding,
          overflow: 'hidden',
        }}>
          {partPositions.map((pos, partIdx) => {
            const partName = pos.part?.part?.reference || pos.part?.part?.element_name || `b${partIdx + 1}`
            const partNumber = partNameToNumber.get(partName) || partIdx + 1
            
            const partEnd = partEnds[partIdx]
            if (!partEnd) return null
            
            const isFlipped = partFlipStates[partIdx]
            const startType = isFlipped ? partEnd.endCut.type : partEnd.startCut.type
            const endType = isFlipped ? partEnd.startCut.type : partEnd.endCut.type
            const startDev = isFlipped ? partEnd.endCut.deviation || 0 : partEnd.startCut.deviation || 0
            const endDev = isFlipped ? partEnd.startCut.deviation || 0 : partEnd.endCut.deviation || 0
            
            let startIsShared = false
            let endIsShared = false
            
            if (partIdx > 0) {
              const boundaryX = partIdx === 0 ? 0 : Math.floor(pos.xStart)
              startIsShared = sharedBoundarySet.has(boundaryX)
            }
            
            if (partIdx < numParts - 1) {
              const rightPartXStart = partPositions[partIdx + 1].xStart
              const boundaryX = (partIdx + 1) === 0 ? 0 : Math.floor(rightPartXStart)
              endIsShared = sharedBoundarySet.has(boundaryX)
            } else if (partIdx === lastPartIdx && pattern.waste > 0) {
              endIsShared = false
            }
            
            const xPx = partIdx === 0 ? 0 : pos.xStart
            let endPx: number
            if (partIdx === lastPartIdx && pattern.waste > 0) {
              endPx = exactPartsEndPx
            } else if (partIdx < numParts - 1) {
              endPx = partPositions[partIdx + 1].xStart
            } else {
              endPx = pos.xEnd
            }
            
            const xPxScaled = xPx * widthScale
            const endPxScaled = endPx * widthScale
            
            const visualHeight = (pdfHeight - 1) * 0.2
            const degToRad = (deg: number) => (deg * Math.PI) / 180
            const calcBoundaryOffset = (devDeg: number, partWidthPx: number) => {
              if (!devDeg || devDeg <= 0) return 0
              const raw = Math.tan(degToRad(devDeg)) * visualHeight
              const maxAllowed = Math.min(partWidthPx * 0.25, visualHeight)
              return Math.max(0, Math.min(raw, maxAllowed))
            }
            
            const bothSignificantMiters = startType === 'miter' && endType === 'miter' && startDev >= 1.0 && endDev >= 1.0
            const hasSlopedStart = startType === 'miter' && startDev > 0 && (partIdx > 0 || bothSignificantMiters)
            const hasSlopedEnd = endType === 'miter' && endDev > 0 && (partIdx < numParts - 1 || (partIdx === lastPartIdx && pattern.waste > 0))
            
            let polyLeftX = xPx
            let polyRightX = endPx
            
            if (partIdx === lastPartIdx && pattern.waste > 0 && hasSlopedEnd) {
              polyRightX = exactPartsEndPx
            }
            
            const polyLeftXScaled = polyLeftX * widthScale
            const polyRightXScaled = polyRightX * widthScale
            const wPx = polyRightX - polyLeftX
            
            const startOffset = hasSlopedStart ? calcBoundaryOffset(startDev, wPx) * widthScale : 0
            const endOffset = hasSlopedEnd ? calcBoundaryOffset(endDev, wPx) * widthScale : 0
            
            let points: Array<{ x: number, y: number }> = []
            
            if (hasSlopedStart && hasSlopedEnd) {
              const topLeftX = polyLeftXScaled
              const topRightX = polyRightXScaled - endOffset
              const bottomLeftX = polyLeftXScaled + startOffset
              const bottomRightX = polyRightXScaled
              points = [
                { x: topLeftX, y: 0 },
                { x: topRightX, y: 0 },
                { x: bottomRightX, y: contentHeight - contentPadding },
                { x: bottomLeftX, y: contentHeight - contentPadding }
              ]
            } else if (hasSlopedStart) {
              const topLeftX = polyLeftXScaled
              const bottomLeftX = polyLeftXScaled + startOffset
              points = [
                { x: topLeftX, y: 0 },
                { x: polyRightXScaled, y: 0 },
                { x: polyRightXScaled, y: contentHeight - contentPadding },
                { x: bottomLeftX, y: contentHeight - contentPadding }
              ]
            } else if (hasSlopedEnd) {
              const topRightX = polyRightXScaled - endOffset
              const bottomRightX = polyRightXScaled
              points = [
                { x: polyLeftXScaled, y: 0 },
                { x: topRightX, y: 0 },
                { x: bottomRightX, y: contentHeight - contentPadding },
                { x: polyLeftXScaled, y: contentHeight - contentPadding }
              ]
            } else {
              points = [
                { x: polyLeftXScaled, y: 0 },
                { x: polyRightXScaled, y: 0 },
                { x: polyRightXScaled, y: contentHeight - contentPadding },
                { x: polyLeftXScaled, y: contentHeight - contentPadding }
              ]
            }
            
            const maxRight = contentWidth - contentPadding
            points = points.map(p => ({
              x: Math.max(0, Math.min(p.x, maxRight)),
              y: Math.max(0, Math.min(p.y, contentHeight - contentPadding))
            }))
            
            const pointsString = points.map(p => `${p.x},${p.y}`).join(' ')
            
            return (
              <View
                key={partIdx}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: contentWidth,
                  height: contentHeight,
                  overflow: 'hidden',
                }}
              >
                <Svg
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: contentWidth,
                    height: contentHeight,
                  }}
                >
                  <Polygon
                    points={pointsString}
                    fill="rgba(156, 163, 175, 0.1)"
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />
                </Svg>
                
                {(() => {
                  const partWidth = Math.abs(polyRightXScaled - polyLeftXScaled)
                  
                  if (partWidth < 10) return null
                  
                  return (
                    <View style={{
                      position: 'absolute',
                      left: polyLeftXScaled,
                      top: 0,
                      width: partWidth,
                      height: pdfHeight,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{
                        fontSize: 8,
                        fontWeight: 'bold',
                        color: '#1f2937',
                      }}>
                        {String(partNumber)}
                      </Text>
                    </View>
                  )
                })()}
              </View>
            )
          })}
          
          {partPositions.map((pos, partIdx) => {
            const partEnd = partEnds[partIdx]
            if (!partEnd) return null
            
            const isFlipped = partFlipStates[partIdx]
            const startType = isFlipped ? partEnd.endCut.type : partEnd.startCut.type
            const endType = isFlipped ? partEnd.startCut.type : partEnd.endCut.type
            const startDev = isFlipped ? partEnd.endCut.deviation || 0 : partEnd.startCut.deviation || 0
            const endDev = isFlipped ? partEnd.startCut.deviation || 0 : partEnd.endCut.deviation || 0
            
            let startIsShared = false
            let endIsShared = false
            
            if (partIdx > 0) {
              const boundaryX = Math.floor(pos.xStart)
              startIsShared = sharedBoundarySet.has(boundaryX)
            }
            
            if (partIdx < numParts - 1) {
              const rightPartXStart = partPositions[partIdx + 1].xStart
              const boundaryX = Math.floor(rightPartXStart)
              endIsShared = sharedBoundarySet.has(boundaryX)
            } else if (partIdx === lastPartIdx && pattern.waste > 0) {
              endIsShared = false
            }
            
            const diagonalOffset = 12
            const SIGNIFICANT_MITER_DEG = 8.0
            const maxRight = contentWidth - contentPadding
            
            return (
              <React.Fragment key={`non-shared-${partIdx}`}>
                {/* Start cut marker - only if NOT shared AND NOT first part */}
                {/* ONLY show for straight cuts - sloped non-shared boundaries don't need markers */}
                {!startIsShared && partIdx > 0 && startType === 'straight' && (() => {
                  const boundaryX = Math.round(pos.xStart)
                  const boundaryXScaled = boundaryX * widthScale
                  const clampedX = Math.max(0, Math.min(boundaryXScaled, maxRight))
                  
                  return (
                    <View
                      key={`start-boundary-${partIdx}`}
                      style={{
                        position: 'absolute',
                        left: clampedX,
                        top: 0,
                        width: 1,
                        height: contentHeight - contentPadding,
                        backgroundColor: '#9ca3af',
                      }}
                    />
                  )
                })()}
                
                {/* End cut marker - for non-last parts or last part with waste */}
                {(() => {
                  const isLastPartWithWaste = partIdx === lastPartIdx && pattern.waste > 0
                  const shouldShowMarker = !endIsShared || isLastPartWithWaste
                  
                  if (!shouldShowMarker) return null
                  
                  // For last part with straight cut, don't draw here (will be drawn outside clipPath)
                  if (isLastPartWithWaste && endType === 'straight') {
                    return null
                  }
                  
                  // ONLY show for straight cuts - sloped non-shared boundaries don't need markers
                  if (endType !== 'straight') return null
                  
                  const boundaryX = (partIdx < numParts - 1 && partPositions[partIdx + 1])
                    ? Math.round(partPositions[partIdx + 1].xStart)
                    : exactPartsEndPx
                  const boundaryXScaled = boundaryX * widthScale
                  const clampedX = Math.max(0, Math.min(boundaryXScaled, maxRight))
                  
                  return (
                    <View
                      key={`end-boundary-${partIdx}`}
                      style={{
                        position: 'absolute',
                        left: clampedX,
                        top: 0,
                        width: 1,
                        height: contentHeight - contentPadding,
                        backgroundColor: '#9ca3af',
                      }}
                    />
                  )
                })()}
              </React.Fragment>
            )
          })}
          
          {/* End boundary line for last part - draw outside clipPath to ensure visibility */}
          {exactPartsEndPx > 0 && pattern.waste > 0 && (() => {
            const lastPartEnd = partEnds[lastPartIdx]
            if (!lastPartEnd) return null
            
            const isFlipped = partFlipStates[lastPartIdx]
            const endType = isFlipped ? lastPartEnd.startCut.type : lastPartEnd.endCut.type
            const endDev = isFlipped ? lastPartEnd.startCut.deviation || 0 : lastPartEnd.endCut.deviation || 0
            
            const boundaryX = exactPartsEndPx
            const boundaryXScaled = boundaryX * widthScale
            const clampedX = Math.max(0, Math.min(boundaryXScaled, contentWidth - contentPadding))
            
            if (endType === 'miter') {
              // Sloped end boundary - use calcDiagOffset
              const lastPartXStart = partPositions[lastPartIdx].xStart
              const partWidthPx = Math.max(1, exactPartsEndPx - (lastPartIdx === 0 ? 0 : lastPartXStart))
              
              const degToRad = (deg: number) => (deg * Math.PI) / 180
              const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
              const calcDiagOffset = (devDeg: number, partWidthPx: number) => {
                if (!devDeg || devDeg <= 0) return 0
                const raw = Math.tan(degToRad(devDeg)) * (appHeight - 1)
                const maxAllowed = Math.max(2, Math.min(partWidthPx * 0.45, appHeight - 2))
                return clamp(raw, 0, maxAllowed)
              }
              
              const diagonalOffset = calcDiagOffset(endDev, partWidthPx)
              
              let x1App = boundaryX - diagonalOffset
              let y1App = 0
              let x2App = boundaryX
              let y2App = appHeight
              
              const x1Pdf = (x1App + 0.5) * widthScale
              const y1Pdf = (y1App + 0.5) * heightScale
              const x2Pdf = (x2App + 0.5) * widthScale
              const y2Pdf = (y2App - 0.5) * heightScale
              
              return (
                <Svg
                  key="last-part-boundary"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: contentWidth,
                    height: contentHeight,
                  }}
                >
                  <Line
                    x1={String(x1Pdf)}
                    y1={String(y1Pdf)}
                    x2={String(x2Pdf)}
                    y2={String(y2Pdf)}
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />
                </Svg>
              )
            } else {
              // Straight end boundary
              return (
                <View
                  key="last-part-boundary"
                  style={{
                    position: 'absolute',
                    left: clampedX,
                    top: 0,
                    width: 1,
                    height: contentHeight - contentPadding,
                    backgroundColor: '#9ca3af',
                  }}
                />
              )
            }
          })()}
          
          {sharedBoundaries.map((sb, idx) => {
            const xSnapped = sb.x
            const boundaryXScaled = xSnapped * widthScale
            const maxRight = contentWidth - contentPadding
            
            if (sb.leftEndType === 'straight' && sb.rightStartType === 'straight') {
              const clampedX = Math.max(0, Math.min(boundaryXScaled, maxRight))
              
              return (
                <View
                  key={`shared-boundary-${idx}`}
                  style={{
                    position: 'absolute',
                    left: clampedX,
                    top: 0,
                    width: 1,
                    height: contentHeight - contentPadding,
                    backgroundColor: '#9ca3af',
                  }}
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
              
              // Use calcDiagOffset from app
              const degToRad = (deg: number) => (deg * Math.PI) / 180
              const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
              const calcDiagOffset = (devDeg: number, partWidthPx: number) => {
                if (!devDeg || devDeg <= 0) return 0
                const raw = Math.tan(degToRad(devDeg)) * (appHeight - 1)
                const maxAllowed = Math.max(2, Math.min(partWidthPx * 0.45, appHeight - 2))
                return clamp(raw, 0, maxAllowed)
              }
              
              const diagonalOffset = calcDiagOffset(ownerDev, ownerWidthPx)
              
              let x1App, y1App, x2App, y2App
              if (ownerSide === 'left') {
                x1App = xSnapped - diagonalOffset
                y1App = 0
                x2App = xSnapped
                y2App = appHeight
              } else {
                x1App = xSnapped
                y1App = 0
                x2App = xSnapped + diagonalOffset
                y2App = appHeight
              }
              
              const x1Pdf = (x1App + 0.5) * widthScale
              const y1Pdf = (y1App + 0.5) * heightScale
              const x2Pdf = (x2App + 0.5) * widthScale
              const y2Pdf = (y2App - 0.5) * heightScale
              
              return (
                <Svg
                  key={`shared-boundary-${idx}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: contentWidth,
                    height: contentHeight,
                  }}
                >
                  <Line
                    x1={String(x1Pdf)}
                    y1={String(y1Pdf)}
                    x2={String(x2Pdf)}
                    y2={String(y2Pdf)}
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />
                </Svg>
              )
            } else {
              // Mixed types: one straight, one miter
              // Show the marker based on which side has the miter
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
              
              // Use calcDiagOffset from app
              const degToRad = (deg: number) => (deg * Math.PI) / 180
              const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
              const calcDiagOffset = (devDeg: number, partWidthPx: number) => {
                if (!devDeg || devDeg <= 0) return 0
                const raw = Math.tan(degToRad(devDeg)) * (appHeight - 1)
                const maxAllowed = Math.max(2, Math.min(partWidthPx * 0.45, appHeight - 2))
                return clamp(raw, 0, maxAllowed)
              }
              
              const diagonalOffset = calcDiagOffset(
                leftIsMiter ? sb.leftDev : sb.rightDev,
                leftIsMiter ? leftWidthPx : rightWidthPx
              )
              
              if (leftIsMiter) {
                // Left end is miter - show sloped marker
                const resolvedBoundary = boundaryMap.get(xSnapped)
                const ownerSide = resolvedBoundary?.ownerSide || 'left'
                
                let x1App, y1App, x2App, y2App
                if (ownerSide === 'left') {
                  x1App = xSnapped - diagonalOffset
                  y1App = 0
                  x2App = xSnapped
                  y2App = appHeight
                } else {
                  x1App = xSnapped
                  y1App = 0
                  x2App = xSnapped + diagonalOffset
                  y2App = appHeight
                }
                
                const x1Pdf = (x1App + 0.5) * widthScale
                const y1Pdf = (y1App + 0.5) * heightScale
                const x2Pdf = (x2App + 0.5) * widthScale
                const y2Pdf = (y2App - 0.5) * heightScale
                
                return (
                  <Svg
                    key={`shared-boundary-${idx}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: contentWidth,
                      height: contentHeight,
                    }}
                  >
                    <Line
                      x1={String(x1Pdf)}
                      y1={String(y1Pdf)}
                      x2={String(x2Pdf)}
                      y2={String(y2Pdf)}
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />
                  </Svg>
                )
              } else if (rightIsMiter && sb.rightPartIdx === numParts - 1) {
                // Right start is miter and it's the last internal boundary - show sloped
                const resolvedBoundary = boundaryMap.get(xSnapped)
                const ownerSide = resolvedBoundary?.ownerSide || 'right'
                
                let x1App, y1App, x2App, y2App
                if (ownerSide === 'left') {
                  x1App = xSnapped - diagonalOffset
                  y1App = 0
                  x2App = xSnapped
                  y2App = appHeight
                } else {
                  x1App = xSnapped
                  y1App = 0
                  x2App = xSnapped + diagonalOffset
                  y2App = appHeight
                }
                
                const x1Pdf = (x1App + 0.5) * widthScale
                const y1Pdf = (y1App + 0.5) * heightScale
                const x2Pdf = (x2App + 0.5) * widthScale
                const y2Pdf = (y2App - 0.5) * heightScale
                
                return (
                  <Svg
                    key={`shared-boundary-${idx}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: contentWidth,
                      height: contentHeight,
                    }}
                  >
                    <Line
                      x1={String(x1Pdf)}
                      y1={String(y1Pdf)}
                      x2={String(x2Pdf)}
                      y2={String(y2Pdf)}
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />
                  </Svg>
                )
              } else {
                // Show straight marker (the simpler cut for mixed boundaries)
                const clampedX = Math.max(0, Math.min(boundaryXScaled, maxRight))
                
                return (
                  <View
                    key={`shared-boundary-${idx}`}
                    style={{
                      position: 'absolute',
                      left: clampedX,
                      top: 0,
                      width: 1,
                      height: contentHeight - contentPadding,
                      backgroundColor: '#9ca3af',
                    }}
                  />
                )
              }
            }
          })}
          
          {wasteWidth > 0 && (() => {
            const wasteStartX = exactPartsEndPx * widthScale
            const wasteWidthScaled = wasteWidth * widthScale
            
            const boundaryGap = 1.5
            const wasteStartWithGap = wasteStartX + boundaryGap
            
            const maxRight = contentWidth - contentPadding
            const clampedWasteStart = Math.max(0, Math.min(wasteStartWithGap, maxRight))
            const clampedWasteEnd = Math.max(0, Math.min(wasteStartX + wasteWidthScaled, maxRight))
            const clampedWasteWidth = Math.max(0, clampedWasteEnd - clampedWasteStart)
            const clampedWasteHeight = contentHeight - contentPadding
            
            return (
              <View
                style={{
                  position: 'absolute',
                  left: clampedWasteStart,
                  top: 0,
                  width: clampedWasteWidth,
                  height: clampedWasteHeight,
                  backgroundColor: '#ffffff',
                }}
              />
            )
          })()}
        </View>
      </View>
    </View>
  )
}

// Cutwise Logo Component (from cutwise logo light.svg)
const CutwiseLogo = () => (
  <Svg width="70" height="20" viewBox="0 0 600 169">
    <Path d="M125.81 71.6364H103.355C103.477 69.2727 103.249 67.1667 102.674 65.3182C102.098 63.4394 101.189 61.8333 99.9464 60.5C98.7039 59.1364 97.1585 58.1061 95.31 57.4091C93.4615 56.7121 91.31 56.3636 88.8555 56.3636C84.1585 56.3636 79.9009 57.5303 76.0827 59.8636C72.2645 62.197 69.0676 65.5606 66.4918 69.9545C63.9161 74.3485 62.113 79.6212 61.0827 85.7727C60.1433 91.7121 60.1585 96.6667 61.1282 100.636C62.1282 104.606 63.9767 107.591 66.6736 109.591C69.3706 111.561 72.7948 112.545 76.9464 112.545C79.6433 112.545 82.1433 112.227 84.4464 111.591C86.7797 110.924 88.8858 109.97 90.7645 108.727C92.6433 107.485 94.2645 105.985 95.6282 104.227C97.0221 102.439 98.0979 100.455 98.8555 98.2727H121.492C120.371 102.364 118.522 106.439 115.946 110.5C113.401 114.53 110.189 118.182 106.31 121.455C102.431 124.727 97.9312 127.348 92.81 129.318C87.6888 131.288 81.9918 132.273 75.7191 132.273C67.1433 132.273 59.7494 130.348 53.5373 126.5C47.3555 122.652 42.8858 117.076 40.1282 109.773C37.4009 102.439 36.8858 93.5606 38.5827 83.1364C40.2494 73.0455 43.5373 64.5455 48.4464 57.6364C53.3858 50.7273 59.3858 45.5 66.4464 41.9545C73.5373 38.4091 81.0979 36.6364 89.1282 36.6364C94.9464 36.6364 100.174 37.4242 104.81 39C109.477 40.5455 113.431 42.8182 116.674 45.8182C119.916 48.7879 122.325 52.4394 123.901 56.7727C125.507 61.1061 126.143 66.0606 125.81 71.6364ZM171.278 100.864L177.914 61.1818H200.096L188.46 131H167.278L169.414 118H168.687C166.535 122.273 163.369 125.667 159.187 128.182C155.005 130.667 150.293 131.909 145.05 131.909C140.293 131.909 136.293 130.818 133.05 128.636C129.808 126.455 127.505 123.409 126.141 119.5C124.808 115.561 124.566 110.955 125.414 105.682L132.869 61.1818H155.096L148.414 101.318C147.838 105.106 148.338 108.091 149.914 110.273C151.52 112.455 154.035 113.545 157.46 113.545C159.672 113.545 161.747 113.061 163.687 112.091C165.626 111.091 167.263 109.652 168.596 107.773C169.96 105.864 170.853 103.561 171.278 100.864ZM245.973 61.1818L243.2 77.5455H199.155L201.927 61.1818H245.973ZM213.882 44.4545H236.109L225.382 109.045C225.17 110.409 225.2 111.515 225.473 112.364C225.776 113.182 226.321 113.773 227.109 114.136C227.927 114.47 228.927 114.636 230.109 114.636C230.927 114.636 231.836 114.545 232.836 114.364C233.836 114.182 234.594 114.045 235.109 113.955L235.836 130C234.655 130.333 233.064 130.712 231.064 131.136C229.094 131.591 226.791 131.879 224.155 132C218.821 132.212 214.412 131.591 210.927 130.136C207.473 128.652 205.033 126.348 203.609 123.227C202.215 120.106 201.942 116.197 202.791 111.5L213.882 44.4545ZM310.503 131L303.957 61.1818H326.275L328.23 105.909H328.821L346.366 61.1818H368.139L371.048 105.591H371.639L388.23 61.1818H410.548L380.685 131H356.912L352.73 90.3182H351.957L334.321 131H310.503ZM400.152 131L411.789 61.1818H434.016L422.38 131H400.152ZM424.47 53C421.319 53 418.758 51.9545 416.789 49.8636C414.819 47.7727 414.046 45.2727 414.47 42.3636C414.895 39.4242 416.38 36.9242 418.925 34.8636C421.47 32.803 424.304 31.7727 427.425 31.7727C430.577 31.7727 433.107 32.803 435.016 34.8636C436.955 36.9242 437.713 39.4242 437.289 42.3636C436.925 45.2727 435.47 47.7727 432.925 49.8636C430.41 51.9545 427.592 53 424.47 53ZM497.711 82.5L477.665 83.0455C477.696 81.5606 477.362 80.2576 476.665 79.1364C475.968 77.9848 474.984 77.0909 473.711 76.4545C472.438 75.8182 470.923 75.5 469.165 75.5C466.317 75.5 463.756 76.1364 461.484 77.4091C459.241 78.6818 457.984 80.3333 457.711 82.3636C457.499 83.4545 457.802 84.4091 458.62 85.2273C459.438 86.0151 461.256 86.7121 464.075 87.3182L477.165 89.8636C483.893 91.197 488.772 93.5152 491.802 96.8182C494.862 100.091 495.953 104.424 495.075 109.818C494.287 114.424 492.256 118.409 488.984 121.773C485.741 125.136 481.605 127.742 476.575 129.591C471.575 131.409 466.044 132.318 459.984 132.318C449.741 132.318 442.014 130.258 436.802 126.136C431.62 121.985 429.196 116.485 429.529 109.636L451.165 109.091C451.256 111.667 452.12 113.606 453.756 114.909C455.423 116.182 457.681 116.848 460.529 116.909C463.65 116.97 466.347 116.318 468.62 114.955C470.893 113.591 472.165 111.909 472.438 109.909C472.62 108.606 472.181 107.591 471.12 106.864C470.09 106.136 468.165 105.485 465.347 104.909L453.529 102.591C446.741 101.288 441.832 98.8333 438.802 95.2273C435.802 91.5909 434.772 86.9545 435.711 81.3182C436.499 76.8333 438.347 73.0303 441.256 69.9091C444.196 66.7576 448.029 64.3636 452.756 62.7273C457.514 61.0909 462.938 60.2727 469.029 60.2727C478.787 60.2727 486.15 62.2576 491.12 66.2273C496.12 70.1667 498.317 75.5909 497.711 82.5ZM527.247 132.318C519.944 132.318 513.883 130.879 509.065 128C504.277 125.091 500.913 120.955 498.974 115.591C497.035 110.197 496.686 103.788 497.929 96.3636C499.141 89.1515 501.61 82.8485 505.338 77.4545C509.095 72.0303 513.823 67.8182 519.52 64.8182C525.217 61.7879 531.565 60.2727 538.565 60.2727C543.535 60.2727 547.944 61.0455 551.792 62.5909C555.641 64.1364 558.823 66.4394 561.338 69.5C563.853 72.5303 565.565 76.2576 566.474 80.6818C567.383 85.1061 567.353 90.1818 566.383 95.9091L565.52 101.455H504.883L506.929 88.5455H546.929C547.292 86.1818 547.095 84.0758 546.338 82.2273C545.58 80.3788 544.353 78.9394 542.656 77.9091C540.989 76.8485 538.944 76.3182 536.52 76.3182C534.065 76.3182 531.762 76.8939 529.61 78.0455C527.489 79.1667 525.686 80.6818 524.201 82.5909C522.717 84.5 521.747 86.6515 521.292 89.0455L518.883 102.273C518.398 105.212 518.535 107.727 519.292 109.818C520.05 111.909 521.353 113.515 523.201 114.636C525.05 115.727 527.429 116.273 530.338 116.273C532.277 116.273 534.095 116.015 535.792 115.5C537.489 114.955 539.004 114.152 540.338 113.091C541.701 112 542.807 110.682 543.656 109.136L563.929 109.727C562.292 114.303 559.762 118.288 556.338 121.682C552.913 125.045 548.732 127.667 543.792 129.545C538.883 131.394 533.368 132.318 527.247 132.318Z" fill="#004845"/>
    <Path d="M296.204 52C296.49 51.9986 296.642 52.3477 296.505 52.5985C291.507 61.7079 286.528 70.7833 281.513 79.9231C279.685 83.2552 282.096 87.3281 285.897 87.3281C286.708 87.3281 287.519 87.3281 288.332 87.3281C292.39 87.3281 294.764 91.9113 292.445 95.2407C281.135 111.477 270.408 127.577 259.016 143.676C258.882 143.866 258.698 143.978 258.467 143.956C257.972 143.911 257.625 143.503 257.751 143.022C259.5 136.34 261.257 129.661 262.991 122.977C264.277 118.022 265.549 113.064 266.838 108.042C267.65 104.878 265.261 101.796 261.994 101.796C257.883 101.796 253.786 101.796 249.642 101.796C247.959 101.796 246.856 100.034 247.593 98.5207C254.545 84.2539 261.495 69.9868 268.45 55.7211C268.619 55.3749 268.789 54.9719 268.94 54.5922C269.287 53.7173 269.862 52.9441 270.638 52.4113C270.877 52.2472 271.157 52.1584 271.447 52.1564C274.153 52.1377 288.61 52.0384 296.204 52Z" fill="#FF7700"/>
  </Svg>
)

export const CuttingPlanPDF: React.FC<CuttingPlanPDFProps> = ({ 
  nestingReport, 
  report,
  projectName,
  svgImages = {}
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  const totalPages = nestingReport.profiles.length
  
  return (
    <Document>
      {nestingReport.profiles.map((profile, profileIdx) => (
        <Page key={profileIdx} size="A4" orientation="landscape" style={styles.page}>
          <Text style={{ marginBottom: 10, fontSize: 14, fontWeight: 'bold' }}>
            {profile.profile_name}
          </Text>
          
          {profile.cutting_patterns.map((pattern, patternIdx) => {
            const svgImageKey = `${profile.profile_name}-${patternIdx}`
            const hasSvgImage = svgImages[svgImageKey]
            
            return (
              <View key={patternIdx} style={styles.patternSection} wrap={false}>
                
                {hasSvgImage ? (
                  <View style={{ 
                    marginBottom: 10, 
                    marginTop: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Image 
                      src={svgImages[svgImageKey]} 
                      style={{ 
                        width: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center'
                      }}
                    />
                  </View>
                ) : (
                  <StockBarVisualization pattern={pattern} profileName={profile.profile_name} />
                )}
            </View>
              )
            })}
          
          {/* Footer with divider */}
          <View style={styles.footerContainer} fixed>
            {/* Light gray divider */}
            <View style={styles.footerDivider} />
            
            {/* Footer content */}
            <View style={styles.footerContent}>
              {/* Logo on the left */}
              <CutwiseLogo />
              
              {/* Right side: Date, Project Name, and Page Number with labels and dots */}
              <View style={styles.footerRight}>
                {/* Date */}
                <Text style={styles.footerTextBold}>Date: </Text>
                <Text style={styles.footerText}>{currentDate}</Text>
                
                {projectName && (
                  <>
                    <Text style={styles.footerDot}>•</Text>
                    <Text style={styles.footerTextBold}>Project Name: </Text>
                    <Text style={styles.footerText}>{projectName}</Text>
                  </>
                )}
                
                <Text style={styles.footerDot}>•</Text>
                <Text style={styles.footerTextBold}>Page: </Text>
                <Text style={styles.footerText}>
                  {String(profileIdx + 1).padStart(2, '0')} of {String(totalPages).padStart(2, '0')}
                </Text>
              </View>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}
