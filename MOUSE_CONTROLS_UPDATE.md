# Mouse Controls Update - Pan with Mouse Wheel

## Date: 2026-02-03

## Changes Made

Updated the 3D viewer mouse controls to provide more intuitive interaction:

### 1. Mouse Button Remapping

**Before:**
- Left Mouse: Rotate/Orbit
- Middle Mouse (Wheel): Zoom
- Right Mouse: Pan

**After:**
- **Left Mouse**: Rotate/Orbit
- **Middle Mouse (Wheel)**: Pan (move view)
- **Right Mouse**: Context menu only (no camera controls)

### 2. Right-Click Reserved for Context Menu

**Problem:** Right-click was triggering camera movements/pivot changes, interfering with the context menu functionality.

**Solution:** 
- Completely removed all camera control logic from right-click
- Right-click is now exclusively reserved for opening the context menu when an element is selected
- Set `controls.mouseButtons.RIGHT = -1` to disable OrbitControls handling of right-click
- Added early return in `onPointerDown` for any non-left button clicks

### 3. Implementation Details

#### File: `web/src/components/IFCViewer.tsx`

**Mouse Button Configuration (lines ~296-304):**
```typescript
// Mouse button mappings - Custom configuration
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,     // Left-drag: rotate (orbit around model)
  MIDDLE: THREE.MOUSE.PAN,      // Middle-drag: pan (move view)
  RIGHT: -1                      // Right-click: disabled (reserved for context menu)
}

// Enable pan for middle mouse button
controls.enablePan = true
```

**Pointer Down Handler (lines ~400-403):**
```typescript
// 2) On pointerdown on the canvas
const onPointerDown = (event: PointerEvent) => {
  // Only handle left button for orbit/selection
  // Right-click (button === 2) is reserved for context menu only
  if (event.button !== 0) return
  
  // ... left-click logic continues ...
}
```

**Key Points:**
- **Left-click + drag**: Orbits around the clicked point (pivot calculated on click)
- **Middle-click + drag**: Pans the view
- **Right-click**: No camera controls, only triggers context menu for selected elements

## User Benefits

1. **More Intuitive Pan**: Pan with mouse wheel (middle button) is more standard in 3D applications
2. **Clean Right-Click**: Right-click no longer interferes with camera - exclusively for context menu
3. **No View Jumping**: Right-click doesn't move the camera at all
4. **Smooth Workflow**: Clear separation of camera controls vs. context menu actions

## Testing

Test the following scenarios:
1. **Pan with Mouse Wheel**: Click and hold middle mouse button, move around - view should pan
2. **Right-Click Context Menu**: Right-click on an element - should only show context menu, no camera movement
3. **Left-Click Orbit**: Left-click+drag should orbit around the clicked point
4. **Shift+Left Pan**: Shift+Left-click should still pan as alternative method

## No Breaking Changes

All other controls remain unchanged:
- Zoom with mouse wheel scroll
- Shift+Left for pan (alternative method)
- Measurement mode interactions
- Element selection
- Clipping plane controls

