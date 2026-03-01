import React from 'react'
import { Document, Page, Text, View, StyleSheet, Svg, Line, Polygon } from '@react-pdf/renderer'
import { NestingReport as NestingReportType, SteelReport, CuttingPattern } from '../types'

interface CuttingPlanPDFProps {
  nestingReport: NestingReportType
  report: SteelReport | null
  projectName?: string
}

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 15,
    marginBottom: 10,
    fontWeight: 'bold',
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
    padding: 5,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
    borderRightStyle: 'solid',
  },
  tableCellHeader: {
    fontWeight: 'bold',
  },
  textRight: {
    textAlign: 'right',
  },
  patternSection: {
    marginBottom: 15,
    pageBreakInside: 'avoid',
  },
  patternTitle: {
    fontSize: 11,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  patternSubtitle: {
    fontSize: 9,
    marginBottom: 5,
    color: '#666',
  },
  stockBarContainer: {
    marginBottom: 10,
    backgroundColor: '#ffffff',
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
  const availableForPartsPx = appWidth * (1 - wasteMm / stockLength)
  const partsPxPerMm = totalPartsLengthMm > 0 ? availableForPartsPx / totalPartsLengthMm : pxPerMm
  
  const kerfGapPx = 2
  const kerfGapSlopedPx = 0.5
  let cumulativeX = 0
  const partPositions = sortedParts.map((part, partIdx) => {
    const lengthMm = part.length || 0
    const xStart = cumulativeX
    const xEnd = cumulativeX + (lengthMm * partsPxPerMm)
    
    const nextPart = sortedParts[partIdx + 1]
    const currentSlopeInfo = (part as any)?.slope_info || {}
    const nextSlopeInfo = (nextPart as any)?.slope_info || {}
    const hasSlopes = currentSlopeInfo.end_has_slope === true || nextSlopeInfo.start_has_slope === true
    const gapToUse = hasSlopes ? kerfGapSlopedPx : kerfGapPx
    
    cumulativeX = xEnd + gapToUse
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
      const bothNearStraight = 
        (leftDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING) && 
        (rightDev < NEAR_STRAIGHT_THRESHOLD_FOR_SHARING)
      
      if (bothNearStraight) {
        isShared = true
      } else {
        isShared = true
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
            
            const diagonalOffset = 12
            const SIGNIFICANT_MITER_DEG = 8.0
            const maxRight = contentWidth - contentPadding
            
            return (
              <React.Fragment key={`non-shared-${partIdx}`}>
                {!startIsShared && (() => {
                  const boundaryX = partIdx === 0 ? 0 : Math.round(pos.xStart)
                  const boundaryXScaled = boundaryX * widthScale
                  const clampedX = Math.max(0, Math.min(boundaryXScaled, maxRight))
                  
                  if (startType === 'miter' && startDev >= SIGNIFICANT_MITER_DEG) {
                    let x1App = boundaryX + 0.5
                    let y1App = 0.5
                    let x2App = boundaryX + diagonalOffset + 0.5
                    let y2App = appHeight - 0.5
                    
                    const clipped = clipLineToBounds(x1App, y1App, x2App, y2App, 0, 0, appWidth, appHeight)
                    if (!clipped.visible) return null
                    
                    const x1Pdf = clipped.x1 * widthScale
                    const y1Pdf = clipped.y1 * heightScale
                    const x2Pdf = clipped.x2 * widthScale
                    const y2Pdf = clipped.y2 * heightScale
                    
                    const clippedPdf = clipLineToBounds(x1Pdf, y1Pdf, x2Pdf, y2Pdf, 0, 0, contentWidth, contentHeight - contentPadding)
                    if (!clippedPdf.visible) return null
                    
                    return (
                      <Svg
                        key={`start-boundary-${partIdx}`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: contentWidth,
                          height: contentHeight,
                        }}
                      >
                        <Line
                          x1={String(clippedPdf.x1)}
                          y1={String(clippedPdf.y1)}
                          x2={String(clippedPdf.x2)}
                          y2={String(clippedPdf.y2)}
                          stroke="#d1d5db"
                          strokeWidth="1"
                        />
                      </Svg>
                    )
                  } else {
                    return (
                      <View
                        key={`start-boundary-${partIdx}`}
                        style={{
                          position: 'absolute',
                          left: clampedX,
                          top: 0,
                          width: 1,
                          height: contentHeight - contentPadding,
                          backgroundColor: '#d1d5db',
                        }}
                      />
                    )
                  }
                })()}
                
                {(() => {
                  const isLastPartWithWaste = partIdx === lastPartIdx && pattern.waste > 0
                  const shouldShowMarker = !endIsShared || isLastPartWithWaste
                  
                  if (!shouldShowMarker) return null
                  
                  const boundaryX = partIdx === lastPartIdx && pattern.waste > 0
                    ? exactPartsEndPx
                    : (partIdx < numParts - 1 && partPositions[partIdx + 1])
                      ? Math.round(partPositions[partIdx + 1].xStart)
                      : exactPartsEndPx
                  const boundaryXScaled = boundaryX * widthScale
                  const clampedX = Math.max(0, Math.min(boundaryXScaled, maxRight))
                  
                  if (endType === 'miter' && endDev >= SIGNIFICANT_MITER_DEG) {
                    let x1App = boundaryX - diagonalOffset + 0.5
                    let y1App = 0.5
                    let x2App = boundaryX + 0.5
                    let y2App = appHeight - 0.5
                    
                    const clipped = clipLineToBounds(x1App, y1App, x2App, y2App, 0, 0, appWidth, appHeight)
                    if (!clipped.visible) return null
                    
                    const x1Pdf = clipped.x1 * widthScale
                    const y1Pdf = clipped.y1 * heightScale
                    const x2Pdf = clipped.x2 * widthScale
                    const y2Pdf = clipped.y2 * heightScale
                    
                    const clippedPdf = clipLineToBounds(x1Pdf, y1Pdf, x2Pdf, y2Pdf, 0, 0, contentWidth, contentHeight - contentPadding)
                    if (!clippedPdf.visible) return null
                    
                    return (
                      <Svg
                        key={`end-boundary-${partIdx}`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: contentWidth,
                          height: contentHeight,
                        }}
                      >
                        <Line
                          x1={String(clippedPdf.x1)}
                          y1={String(clippedPdf.y1)}
                          x2={String(clippedPdf.x2)}
                          y2={String(clippedPdf.y2)}
                          stroke="#d1d5db"
                          strokeWidth="1"
                        />
                      </Svg>
                    )
                  } else {
                    return (
                      <View
                        key={`end-boundary-${partIdx}`}
                        style={{
                          position: 'absolute',
                          left: clampedX,
                          top: 0,
                          width: 1,
                          height: contentHeight - contentPadding,
                          backgroundColor: '#d1d5db',
                        }}
                      />
                    )
                  }
                })()}
              </React.Fragment>
            )
          })}
          
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
                    backgroundColor: '#d1d5db',
                  }}
                />
              )
            } else if (sb.leftEndType === 'miter' && sb.rightStartType === 'miter') {
              const diagonalOffset = 12
              
              const resolvedBoundary = boundaryMap.get(xSnapped)
              const ownerSide = resolvedBoundary?.ownerSide || 'left'
              
              let x1App, y1App, x2App, y2App
              if (ownerSide === 'left') {
                x1App = xSnapped - diagonalOffset + 0.5
                y1App = 0.5
                x2App = xSnapped + 0.5
                y2App = appHeight - 0.5
              } else {
                x1App = xSnapped + 0.5
                y1App = 0.5
                x2App = xSnapped + diagonalOffset + 0.5
                y2App = appHeight - 0.5
              }
              
              const clipped = clipLineToBounds(x1App, y1App, x2App, y2App, 0, 0, appWidth, appHeight)
              
              if (!clipped.visible) return null
              
              const x1Pdf = clipped.x1 * widthScale
              const y1Pdf = clipped.y1 * heightScale
              const x2Pdf = clipped.x2 * widthScale
              const y2Pdf = clipped.y2 * heightScale
              
              const clippedPdf = clipLineToBounds(x1Pdf, y1Pdf, x2Pdf, y2Pdf, 0, 0, contentWidth, contentHeight - contentPadding)
              
              if (!clippedPdf.visible) return null
              
              return (
                <Svg
                  key={`shared-sloped-${idx}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: contentWidth,
                    height: contentHeight,
                  }}
                >
                  <Line
                    x1={String(clippedPdf.x1)}
                    y1={String(clippedPdf.y1)}
                    x2={String(clippedPdf.x2)}
                    y2={String(clippedPdf.y2)}
                    stroke="#d1d5db"
                    strokeWidth="1"
                  />
                </Svg>
              )
            } else {
              const diagonalOffset = 12
              
              const leftIsMiter = sb.leftEndType === 'miter' && sb.leftDev > 0
              const rightIsMiter = sb.rightStartType === 'miter' && sb.rightDev > 0
              
              if (leftIsMiter) {
                let x1App, y1App, x2App, y2App
                x1App = xSnapped - diagonalOffset + 0.5
                y1App = 0.5
                x2App = xSnapped + 0.5
                y2App = appHeight - 0.5
                
                const clipped = clipLineToBounds(x1App, y1App, x2App, y2App, 0, 0, appWidth, appHeight)
                
                if (!clipped.visible) return null
                
                const x1Pdf = clipped.x1 * widthScale
                const y1Pdf = clipped.y1 * heightScale
                const x2Pdf = clipped.x2 * widthScale
                const y2Pdf = clipped.y2 * heightScale
                
                const clippedPdf = clipLineToBounds(x1Pdf, y1Pdf, x2Pdf, y2Pdf, 0, 0, contentWidth, contentHeight - contentPadding)
                
                if (!clippedPdf.visible) return null
                
                return (
                  <Svg
                    key={`shared-sloped-${idx}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: contentWidth,
                      height: contentHeight,
                    }}
                  >
                    <Line
                      x1={String(clippedPdf.x1)}
                      y1={String(clippedPdf.y1)}
                      x2={String(clippedPdf.x2)}
                      y2={String(clippedPdf.y2)}
                      stroke="#d1d5db"
                      strokeWidth="1"
                    />
                  </Svg>
                )
              } else if (rightIsMiter) {
                let x1App, y1App, x2App, y2App
                x1App = xSnapped + 0.5
                y1App = 0.5
                x2App = xSnapped + diagonalOffset + 0.5
                y2App = appHeight - 0.5
                
                const clipped = clipLineToBounds(x1App, y1App, x2App, y2App, 0, 0, appWidth, appHeight)
                
                if (!clipped.visible) return null
                
                const x1Pdf = clipped.x1 * widthScale
                const y1Pdf = clipped.y1 * heightScale
                const x2Pdf = clipped.x2 * widthScale
                const y2Pdf = clipped.y2 * heightScale
                
                const clippedPdf = clipLineToBounds(x1Pdf, y1Pdf, x2Pdf, y2Pdf, 0, 0, contentWidth, contentHeight - contentPadding)
                
                if (!clippedPdf.visible) return null
                
                return (
                  <Svg
                    key={`shared-sloped-${idx}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: contentWidth,
                      height: contentHeight,
                    }}
                  >
                    <Line
                      x1={String(clippedPdf.x1)}
                      y1={String(clippedPdf.y1)}
                      x2={String(clippedPdf.x2)}
                      y2={String(clippedPdf.y2)}
                      stroke="#d1d5db"
                      strokeWidth="1"
                    />
                  </Svg>
                )
              } else {
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
                      backgroundColor: '#d1d5db',
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

export const CuttingPlanPDF: React.FC<CuttingPlanPDFProps> = ({ 
  nestingReport, 
  report,
  projectName
}) => {
  return (
    <Document>
      {nestingReport.profiles.map((profile, profileIdx) => (
        <Page key={profileIdx} size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.sectionTitle}>Cutting Plan</Text>
          {projectName && (
            <Text style={{ marginBottom: 5, fontSize: 11, fontWeight: 'bold' }}>
              Project: {projectName}
            </Text>
          )}
          <Text style={{ marginBottom: 10, fontSize: 11 }}>
            {profile.profile_name} ({profile.total_parts} parts)
          </Text>
          
          {profile.cutting_patterns.map((pattern, patternIdx) => (
            <View key={patternIdx} style={styles.patternSection}>
              <Text style={styles.patternTitle}>
                Bar {patternIdx + 1}: {formatLength(pattern.stock_length)} stock
              </Text>
              <Text style={styles.patternSubtitle}>
                Waste: {formatLength(pattern.waste)} ({pattern.waste_percentage.toFixed(2)}%)
              </Text>
              
              <StockBarVisualization pattern={pattern} profileName={profile.profile_name} />
              
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: '8%' }]}>Number</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: '20%' }]}>Profile Name</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: '20%' }]}>Part Name</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: '15%' }]}>Cut Length (mm)</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: '10%' }]}>Quantity</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: '13%' }]}>Start Angle</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: '14%' }]}>End Angle</Text>
                </View>
                {(() => {
                  const partGroups = new Map<string, { name: string, length: number, count: number, startAngle: any, endAngle: any }>()
                  
                  pattern.parts.forEach((part) => {
                    const partData = part?.part || {}
                    const partName = partData.reference || partData.element_name || 'Unknown'
                    const partLength = part?.length || 0
                    const startAngle = partData.start_angle
                    const endAngle = partData.end_angle
                    const key = `${partName}|${partLength.toFixed(2)}`
                    
                    if (partGroups.has(key)) {
                      partGroups.get(key)!.count += 1
                    } else {
                      partGroups.set(key, {
                        name: partName,
                        length: partLength,
                        count: 1,
                        startAngle: startAngle,
                        endAngle: endAngle
                      })
                    }
                  })
                  
                  const sortedGroups = Array.from(partGroups.values()).sort((a, b) => b.length - a.length)
                  
                  const formatAngle = (angle: any) => {
                    if (angle === null || angle === undefined) return '90.0°'
                    
                    let numericAngle: number
                    if (typeof angle === 'number') {
                      numericAngle = angle
                    } else if (typeof angle === 'string') {
                      const match = angle.match(/-?\d+(\.\d+)?/)
                      numericAngle = match ? parseFloat(match[0]) : 90
                    } else {
                      return '90.0°'
                    }
                    
                    return `${numericAngle.toFixed(1)}°`
                  }
                  
                  return sortedGroups.map((group, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.textRight, { width: '8%' }]}>
                        {idx + 1}
                      </Text>
                      <Text style={[styles.tableCell, { width: '20%' }]}>
                        {profile.profile_name}
                      </Text>
                      <Text style={[styles.tableCell, { width: '20%' }]}>
                        {group.name}
                      </Text>
                      <Text style={[styles.tableCell, styles.textRight, { width: '15%' }]}>
                        {Math.round(group.length)}
                      </Text>
                      <Text style={[styles.tableCell, styles.textRight, { width: '10%' }]}>
                        {group.count}
                      </Text>
                      <Text style={[styles.tableCell, styles.textRight, { width: '13%' }]}>
                        {formatAngle(group.startAngle)}
                      </Text>
                      <Text style={[styles.tableCell, styles.textRight, { width: '14%' }]}>
                        {formatAngle(group.endAngle)}
                      </Text>
                    </View>
                  ))
                })()}
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  )
}
