# Zoom Speed and Pivot Behavior Fix

**Date**: February 3, 2026  
**Issues Fixed**:
1. Zoom in/out too slow
2. Left-click causing unwanted camera zoom/pivot to click point

**Status**: ✅ Fixed

---

## 🐛 Problems

### 1. Slow Zoom Speed
- Zoom in/out felt sluggish
- Required too much scrolling
- Not responsive enough

### 2. Unwanted Pivot Behavior
- Left-clicking to rotate would cause camera to zoom/move to the clicked point
- Camera would animate to a new position when starting to drag
- Disruptive and unexpected behavior
- Made simple rotation movements difficult

---

## 🔍 Root Causes

### 1. Zoom Speed Too Low
```typescript
controls.zoomSpeed = 1.2  // Too slow
```

### 2. Automatic Pivot Point Calculation
The viewer was calculating a pivot point on every left-click and animating the camera to that point when dragging started:

```typescript
// On pointer down: Calculate pivot point at cursor
if (containerRef.current && camera && controls) {
  // Raycast to find clicked point on geometry
  // Store pivot point
  pendingPivotRef.current = pivotPoint
}

// On drag start: Animate camera to pivot point
if (pendingPivotRef.current && camera && controls) {
  const pivotPoint = pendingPivotRef.current
  oldTargetRef.current = controls.target.clone()
  oldCameraPosRef.current = camera.position.clone()
  targetPivotRef.current = pivotPoint.clone()
  isAnimatingPivotRef.current = true  // Causes zoom animation
  animationStartTimeRef.current = performance.now()
}
```

This caused the camera to "jump" or "zoom" to wherever you clicked, which was unexpected and disruptive for users who just wanted to rotate the view.

---

## ✅ Solutions

### 1. Increased Zoom Speed

**Changed from:**
```typescript
controls.zoomSpeed = 1.2  // Slow
```

**Changed to:**
```typescript
controls.zoomSpeed = 1.8  // 50% faster
```

### 2. Disabled Pivot Point Behavior

Commented out the entire pivot point calculation and animation system:

**In `onPointerDown` handler (~line 417):**
```typescript
// DISABLED: Pivot point calculation (was causing camera to zoom to click point)
// Users prefer simple rotation without camera repositioning
/*
// Calculate and store pivot point at cursor position...
// (entire 60-line block commented out)
*/
```

**In `onPointerMove` handler (~line 657):**
```typescript
// DISABLED: Pivot animation (was causing camera to zoom to click point)
/*
// Start smooth animation to the pivot point...
// (entire animation block commented out)
*/
```

---

## 📊 Improvements

| Aspect | Before | After | Change |
|--------|--------|-------|--------|
| **Zoom Speed** | 1.2 | **1.8** | +50% faster |
| **Zoom Feel** | Slow | **Quick & responsive** | ✅ |
| **Left-Click Rotation** | Zooms to click point | **Simple rotation** | ✅ |
| **Camera Movement** | Unexpected jumps | **Predictable** | ✅ |
| **User Experience** | Confusing | **Intuitive** | ✅ |

---

## 🎯 How It Works Now

### Camera Controls

**Rotation (Left-Click + Drag)**:
- ✅ Camera rotates around current center
- ✅ No zoom/pivot to clicked point
- ✅ Simple, predictable rotation
- ✅ Smooth and natural feel

**Zooming (Scroll Wheel)**:
- ✅ Faster zoom in/out (50% increase)
- ✅ Responsive to scroll speed
- ✅ Quick navigation

**Panning (Right-Click + Drag)**:
- ✅ Still works as before
- ✅ No changes to pan behavior

---

## 🧪 Testing

### Test the Changes

1. **Start the app:**
   ```bash
   .\start-app.ps1
   ```

2. **Upload an IFC file and go to Model tab**

3. **Test Zoom Speed:**
   - Use scroll wheel to zoom in/out
   - ✅ Should feel faster and more responsive
   - ✅ Less scrolling needed to navigate

4. **Test Rotation (No Pivot):**
   - Left-click and drag on the model
   - ✅ Camera should rotate around current center
   - ✅ Camera should NOT zoom to where you clicked
   - ✅ No unexpected camera movements

5. **Test Panning:**
   - Right-click and drag
   - ✅ Should work normally

---

## 🔍 Technical Details

### Why Pivot Was Problematic

**Original Intent:**
- Allow users to rotate around specific points they click on
- CAD-like behavior for detailed inspection

**Why It Didn't Work:**
- **Unexpected**: Users didn't know camera would move to click point
- **Disruptive**: Simple rotations became complex movements
- **Confusing**: Camera "jumping" was unexpected
- **Preference**: Most users prefer consistent rotation center

### Standard 3D Navigation

Most 3D viewers use a **fixed rotation center**:
- Blender, Maya, 3ds Max: Fixed center
- SketchUp, Rhino: Fixed center
- Web viewers: Fixed center

**Dynamic pivot** (like we had) is less common and requires:
- Clear visual feedback (pivot indicator)
- Explicit mode switching
- User training/documentation

Since our users expected standard behavior, we disabled it.

---

## 💡 Alternative Approaches (Not Implemented)

If pivot-to-click functionality is needed in the future, these approaches would work better:

### Option 1: Explicit Pivot Mode
- Add a "Pivot Mode" button in toolbar
- Only calculate pivot when mode is active
- Visual indicator showing pivot point

### Option 2: Double-Click to Focus
- Left-click + drag = simple rotation (current behavior)
- Double-click = set new pivot point at clicked location
- Clear, intentional action

### Option 3: Modifier Key
- Left-click + drag = simple rotation
- Ctrl + Left-click + drag = pivot to clicked point
- Gives user explicit control

---

## 📝 Files Modified

### `web/src/components/IFCViewer.tsx`

**Changes:**

1. **Line ~280**: Increased zoom speed
   ```typescript
   controls.zoomSpeed = 1.8  // Was 1.2
   ```

2. **Lines ~417-478**: Disabled pivot calculation
   ```typescript
   // DISABLED: Pivot point calculation
   /* ... 60 lines commented out ... */
   ```

3. **Lines ~657-665**: Disabled pivot animation
   ```typescript
   // DISABLED: Pivot animation
   /* ... 8 lines commented out ... */
   ```

---

## 🚀 Results

✅ **Faster Zoom** - 50% increase in zoom speed  
✅ **Simple Rotation** - No unwanted camera movements  
✅ **Predictable Behavior** - Camera does what users expect  
✅ **Better UX** - Intuitive, standard 3D navigation  
✅ **No Confusion** - Clear, consistent controls  

The 3D viewer now provides fast, intuitive navigation that matches user expectations! 🎉

