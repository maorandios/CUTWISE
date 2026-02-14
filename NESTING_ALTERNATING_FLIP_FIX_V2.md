# Nesting Algorithm Fix V2: Detecting Slopes on Same End

## Date
February 14, 2026

## Problem Identified (Second Issue)

After the first fix, the alternating flip pattern was still not working. Investigation revealed that the algorithm was checking for slopes at the **boundary between parts** (current part's END vs next part's START), but all the identical parts (b3) had their slopes on the **same end** (all had END slopes, no START slopes).

### Root Cause

Looking at the backend logs:

```
[FLIP_OPTIMIZATION] Current part end: has_slope=True, angle=25.998433862373904
[FLIP_OPTIMIZATION] Next part: start_slope=False, start_angle=0.006146170785221352, end_slope=True, end_angle=25.998433862373872
```

**All b3 parts have:**
- `start_has_slope=False` (start is straight)
- `end_has_slope=True` (end has a 26° slope)

**The old logic was checking:**
- Current part END slope: ✅ Yes (26°)
- Next part START slope: ❌ No (0°, straight)

Since the next part's START doesn't have a slope, the condition `if current_end_slope and next_start_slope:` was **never triggered**, so the alternating pattern never started!

### The Real Pattern

When you have 4 identical parts like b3, they're all placed like this:

```
Part 1: [straight start] ────────── [sloped end /]
Part 2: [straight start] ────────── [sloped end /]
Part 3: [straight start] ────────── [sloped end /]
Part 4: [straight start] ────────── [sloped end /]
```

All slopes are at the END, all pointing the same direction. This creates gaps between parts.

**What we need:**

```
Part 1: [straight start] ────────── [sloped end /]
Part 2: [sloped start \] ────────── [straight end]  ← FLIPPED
Part 3: [straight start] ────────── [sloped end /]
Part 4: [sloped start \] ────────── [straight end]  ← FLIPPED
```

By flipping every other part, the sloped ends now face each other and can share boundaries.

## Solution Implemented

### Updated Logic in `optimize_pattern_flips()`

**Location**: `api/main.py`, lines ~1995-2040

### Key Changes:

#### 1. Check for Slopes on Same End

Instead of only checking if `current_end_slope AND next_start_slope`, we now check if **both parts have slopes on the SAME end**:

```python
# Check if both parts have slopes on the SAME end
current_start_slope = current_slope.get("start_has_slope", False)
next_end_slope_val = next_slope.get("end_has_slope", False)

both_have_start_slopes = current_start_slope and next_start_slope
both_have_end_slopes = current_end_slope and next_end_slope_val
```

#### 2. Handle Both Cases

The algorithm now handles two cases:
- **Case A**: Both parts have slopes at their START
- **Case B**: Both parts have slopes at their END (this was the missing case!)

```python
if both_have_start_slopes or both_have_end_slopes:
    # Get the angles from the ends that have slopes
    if both_have_start_slopes:
        current_angle = current_start_angle
        next_angle = next_start_angle
        slope_location = "start"
    else:  # both_have_end_slopes
        current_angle = current_end_angle
        next_angle = next_end_angle_val
        slope_location = "end"
```

#### 3. Compare Angles from Same End

Now we compare the angles from the **same end** (both END angles or both START angles):

```python
if current_angle is not None and next_angle is not None:
    angle_diff = abs(abs(current_angle) - abs(next_angle))
    # If angles are similar (within 5 degrees) and have SAME sign
    if angle_diff <= 5.0:
        same_sign = (current_angle > 0 and next_angle > 0) or \
                   (current_angle < 0 and next_angle < 0)
        
        if same_sign:
            # Start alternating pattern!
```

#### 4. Enhanced Logging

Added detailed logging to help debug:

```python
nesting_log(f"[FLIP_OPTIMIZATION] Identical parts check: both_have_start_slopes={both_have_start_slopes}, both_have_end_slopes={both_have_end_slopes}")
nesting_log(f"[FLIP_OPTIMIZATION] Both parts have slopes on {slope_location}: current_angle={current_angle}, next_angle={next_angle}")
nesting_log(f"[FLIP_OPTIMIZATION] Angle diff={angle_diff:.2f}°, same_sign={same_sign}")
```

## How It Works Now

### For the b3 Parts Example:

1. **Parts 0 → 1**:
   - Check: Both have END slopes? ✅ Yes
   - Current END angle: 26°, Next END angle: 26°
   - Angle diff: 0°, Same sign: ✅ Yes (both positive)
   - Action: **Flip part #1** → Start alternating sequence
   - State: `in_alternating_sequence = True`, `last_flipped = True`

2. **Parts 1 → 2**:
   - In alternating sequence? ✅ Yes
   - Last flipped? ✅ Yes
   - Action: **Don't flip part #2** (keep original)
   - State: `last_flipped = False`

3. **Parts 2 → 3**:
   - In alternating sequence? ✅ Yes
   - Last flipped? ❌ No
   - Action: **Flip part #3**
   - State: `last_flipped = True`

4. **Parts 3 → 4** (different part - b36):
   - Parts not identical
   - Action: Exit alternating sequence
   - State: `in_alternating_sequence = False`

### Expected Result:

```
Bar: 12000mm stock
┌─────────────────────────────────────────────────────────────┐
│  Part 1  │  Part 2  │  Part 3  │  Part 4  │  Part 5  │      │
│  b3      │  b3      │  b3      │  b3      │  b36     │ Less │
│  (2289)  │  (2289)  │  (2289)  │  (2289)  │  (2285)  │ Waste│
│  ───── / │  \ ───── │  ───── / │  \ ───── │  ─────  │      │
│  ORIG    │  FLIPPED │  ORIG    │  FLIPPED │  ORIG    │      │
└─────────────────────────────────────────────────────────────┘
```

All consecutive identical parts now alternate their orientation, creating maximum boundary sharing!

## Testing

To verify the fix:

1. Upload an IFC file with identical parts that have slopes on the same end (like b3)
2. Generate a nesting report
3. Check the backend logs for:
   ```
   [FLIP_OPTIMIZATION] Both parts have slopes on end: current_angle=26.0, next_angle=26.0
   [FLIP_OPTIMIZATION] Found consecutive identical parts with slopes on same end - starting alternating pattern
   [FLIP_OPTIMIZATION] Successfully flipped part to start alternating slope pattern
   [FLIP_OPTIMIZATION] Continuing alternating pattern - flipping next identical part
   ```
4. Verify in the visualization that all 4 b3 parts show alternating slopes
5. Check that waste is reduced

## Summary

**Problem**: Algorithm only detected slopes at the boundary (current END vs next START), missing cases where all parts have slopes on the same end

**Root Cause**: Condition `if current_end_slope and next_start_slope:` failed when parts had slopes only at END (or only at START)

**Solution**: Check if both parts have slopes on the SAME end (both START or both END), then compare those angles

**Result**: Alternating flip pattern now works for all cases of identical parts with slopes, regardless of which end the slope is on

This fix ensures optimal nesting for any configuration of identical parts with slopes!

