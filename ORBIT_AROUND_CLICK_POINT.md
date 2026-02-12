# Orbit Around Click Point Feature

**Date**: February 3, 2026  
**Feature**: Camera orbits around the point where you click  
**Status**: ✅ Implemented

---

## 🎯 Feature Description

When you left-click and drag to rotate the model, the camera now orbits around **the exact point you clicked on** rather than a fixed center point.

### How It Works

1. **Click on geometry**: Orbit center becomes the clicked point on the model
2. **Click on empty space**: Orbit center becomes a point in space at the same depth as current view center
3. **No zoom animation**: The camera doesn't move closer/further - only the rotation center changes
4. **Instant response**: No delay or animation, pivot point is set immediately

---

## 🔧 Technical Implementation

### Previous Behavior (Removed)
- Had **animation** to zoom/move camera to clicked point
- Caused unwanted camera movement
- Felt disruptive and unexpected

### New Behavior (Current)
- **Instant pivot** - just changes the orbit center
- **No camera movement** - camera stays in same position
- **No animation** - changes happen immediately
- **Natural rotation** - orbits around what you clicked

---

## 📝 Code Changes

### 1. Pivot Point Calculation (Line ~417)
```typescript
// Re-enabled pivot point calculation
if (containerRef.current && camera && controls) {
  // Raycast to find clicked point on geometry
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mousePosition, camera)
  
  // Find intersection with model
  const intersections = raycaster.intersectObjects(pickables, true)
  
  if (validIntersections.length > 0) {
    pivotPoint = validIntersections[0].point.clone()
  }
  
  // Store for use when drag starts
  pendingPivotRef.current = pivotPoint
}
```

### 2. Instant Pivot (No Animation) (Line ~657)
```typescript
// OLD (caused zoom):
if (pendingPivotRef.current && camera && controls) {
  const pivotPoint = pendingPivotRef.current
  oldTargetRef.current = controls.target.clone()
  oldCameraPosRef.current = camera.position.clone()
  targetPivotRef.current = pivotPoint.clone()
  isAnimatingPivotRef.current = true  // ❌ Caused unwanted animation
  animationStartTimeRef.current = performance.now()
}

// NEW (instant pivot):
if (pendingPivotRef.current && camera && controls) {
  const pivotPoint = pendingPivotRef.current
  
  // Simply update the OrbitControls target - no animation!
  controls.target.copy(pivotPoint)  // ✅ Just change orbit center
  controls.update()
  
  pendingPivotRef.current = null
}
```

---

## 🎨 User Experience

### Example Workflow

**Scenario: Inspecting a Beam**

1. **User clicks on a beam** (left-click down)
2. **Pivot point set to beam surface** (instant, no camera movement)
3. **User drags mouse** (still holding left button)
4. **Camera orbits around that exact point on the beam** ✅
5. **User releases mouse**
6. **Next click sets new pivot point**

**Benefits:**
- ✅ Precise inspection of specific points
- ✅ Natural, intuitive rotation
- ✅ No unexpected camera movements
- ✅ Fast, responsive feel

---

## 🧪 Testing

### Test the Feature

1. **Start the app and go to Model tab**

2. **Test on Geometry:**
   - Click on a beam/plate/column
   - Drag to rotate
   - ✅ Should orbit around the clicked point
   - ✅ No zoom in/out
   - ✅ Immediate response

3. **Test on Empty Space:**
   - Click on background (no geometry)
   - Drag to rotate
   - ✅ Should orbit around point in space
   - ✅ Natural rotation

4. **Test Multiple Points:**
   - Click different locations
   - Each should become new orbit center
   - ✅ Precise control over rotation point

---

## 📊 Comparison

| Aspect | Fixed Center | Animated Pivot | **Instant Pivot (Current)** |
|--------|--------------|----------------|----------------------------|
| **Orbit Center** | Fixed point | Clicked point | **Clicked point** ✅ |
| **Camera Movement** | None | Zooms/moves | **None** ✅ |
| **Animation** | None | 150ms smooth | **Instant** ✅ |
| **User Control** | Low | Medium | **High** ✅ |
| **Feel** | Generic | Disruptive | **Natural** ✅ |

---

## 💡 Why This Works Better

### Problems with Animation (Previous Version)
- ❌ Camera would zoom toward clicked point
- ❌ Unexpected movement confused users
- ❌ Took 150ms to complete
- ❌ Felt "jumpy"

### Benefits of Instant Pivot (Current)
- ✅ Camera stays in place
- ✅ Only orbit center changes
- ✅ Immediate response
- ✅ Predictable behavior
- ✅ Professional CAD-like feel

---

## 🎯 Similar to Professional Tools

This behavior is similar to:
- **Blender**: Alt+Left-click sets pivot, then drag to orbit
- **3ds Max**: Middle-click sets focus point
- **Rhino**: Click-drag orbits around clicked point
- **Fusion 360**: Click-drag orbits around surface point

All professional 3D tools use **instant pivot without zoom** for precise control.

---

## 🔍 Technical Details

### Raycasting
- Uses THREE.Raycaster to find clicked point
- Intersects with visible mesh geometry
- Returns 3D world coordinates

### Fallback Behavior
If no geometry is hit (clicking on background):
- Creates pivot point at same depth as current center
- Uses a plane perpendicular to camera view
- Intersects ray with this plane
- Provides natural rotation even without geometry

### OrbitControls Target
The `controls.target` property:
- Defines the point camera orbits around
- Updated instantly on drag start
- No need for animation or interpolation
- OrbitControls handles the rest automatically

---

## 📝 Files Modified

### `web/src/components/IFCViewer.tsx`

**Line ~417-478**: Re-enabled pivot point calculation
- Raycasts to find clicked point
- Stores in `pendingPivotRef`

**Line ~657-667**: Changed from animation to instant pivot
- Removed animation code
- Simply updates `controls.target`
- Immediate effect, no delay

---

## 🚀 Result

The camera now provides **precise, professional orbit control**:

✅ **Click-to-orbit** - Orbits around where you click  
✅ **No zoom** - Camera doesn't move closer/further  
✅ **Instant** - Immediate response, no animation  
✅ **Natural** - Feels intuitive and professional  
✅ **Precise** - Perfect for detailed inspection  

Users can now inspect specific points on the model with precision! 🎉

