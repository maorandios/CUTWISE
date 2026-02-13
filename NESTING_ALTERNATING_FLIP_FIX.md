# Nesting Algorithm: Alternating Flip Pattern Fix

## Problem
When placing multiple consecutive identical parts in a stockbar, the algorithm was not consistently alternating their flipping orientation. This resulted in gaps between parts that should have been flush.

### Example Issue (from user report):
```
Bar 23: [Part1] [Part1] [Part1] [Part1] [Part2]
                  ^^^^    ^^^^
                  These two should be flipped to match the pattern
```

In the image provided:
- The first two Part 1 instances were correctly alternating (flipped/not flipped)
- The middle two Part 1 instances (marked in red) were NOT alternating
- This created unnecessary gaps instead of a flush zigzag pattern

## Root Cause
The flipping logic (lines 3997-4057) was only checking if flipping would help the current part flush with the **previous part**. It did NOT track whether consecutive identical parts should alternate their flipping to maintain an optimal zigzag pattern.

**The algorithm was checking:**
- ✅ "Does flipping help this part flush with the previous part?"

**But NOT checking:**
- ❌ "Is this the same part as the previous one, and should we alternate?"

## Solution Implemented

### 1. Consecutive Identical Part Detection
**Location**: `api/main.py` around line 4015-4025

Added logic to detect when the current part is identical to the previous part by comparing:
- Length (within 1mm tolerance)
- Start angle (within 0.5° tolerance)
- End angle (within 0.5° tolerance)

```python
# CONSECUTIVE IDENTICAL PARTS: Check if this is the same part as previous
prev_part_ref = prev_part.get("part", {})
is_same_part_as_prev = False
if prev_part_ref:
    # Check if same part by comparing length and angles
    same_length = abs(prev_part_ref.get("length", 0) - part.get("length", 0)) < 1.0
    same_start_angle = abs((prev_part_ref.get("start_angle") or 0) - (part.get("start_angle") or 0)) < 0.5
    same_end_angle = abs((prev_part_ref.get("end_angle") or 0) - (part.get("end_angle") or 0)) < 0.5
    is_same_part_as_prev = same_length and same_start_angle and same_end_angle
```

### 2. Alternation Logic
**Location**: `api/main.py` around line 4027-4033

When consecutive identical parts are detected, the algorithm now alternates their flipping:
- If previous part was **flipped** → current part should be **NOT flipped**
- If previous part was **NOT flipped** → current part should be **flipped**

```python
# If this is the same part type as previous, check if we should alternate flip
should_flip_for_alternation = False
if is_same_part_as_prev:
    prev_was_flipped = prev_part_ref.get("flipped", False)
    # Alternate: if prev was flipped, don't flip this one; if prev wasn't flipped, flip this one
    should_flip_for_alternation = not prev_was_flipped
    if should_flip_for_alternation:
        nesting_log(f"[NESTING] ALTERNATION: Same part as previous - flipping to create zigzag pattern")
```

### 3. Unified Flipping Decision
**Location**: `api/main.py` around line 4051-4065

Combined the alternation logic with the existing flush-optimization logic:

```python
# FLIPPING DECISION: Flip if alternation is needed OR if it helps with flushing
should_flip = should_flip_for_alternation

# If boundaries can't flush, CHECK IF FLIPPING THE PART WOULD HELP
if not can_flush and not should_flip:
    # ... existing flush-check logic ...
    if can_flush_if_flipped:
        should_flip = True

# Apply the flip if needed
if should_flip:
    # Swap start and end properties
    part["start_angle"], part["end_angle"] = part.get("end_angle"), part.get("start_angle")
    part["start_has_slope"], part["end_has_slope"] = part.get("end_has_slope", False), part.get("start_has_slope", False)
    part["flipped"] = True
```

## Expected Results

### Before Fix
```
Bar: [Part1↗] [Part1↗] [Part1↗] [Part1↗]
      ^^^^gap^^^^gap^^^^gap
```
Multiple gaps between identical parts with same orientation.

### After Fix
```
Bar: [Part1↗] [Part1↘] [Part1↗] [Part1↘]
      ^^^^flush^^^^flush^^^^flush
```
Alternating zigzag pattern creates flush connections, eliminating gaps.

## Benefits
1. ✅ **Eliminates gaps** - Consecutive identical parts now flush properly
2. ✅ **Optimal zigzag pattern** - Automatic alternation for best material usage
3. ✅ **Maintains existing logic** - Flush-optimization still works as before
4. ✅ **Works for all part types** - Applies to any parts with slopes

## Testing
To verify the fix:
1. Navigate to `http://localhost:5180/`
2. Upload an IFC file with multiple identical sloped parts
3. Run nesting with stock lengths 6000mm and 12000mm
4. Observe in the SVG visualization:
   - Consecutive identical parts should alternate their orientation
   - No gaps should appear between identical parts
   - The pattern should show a clean zigzag

## Implementation Date
February 13, 2026

## Related Files
- `api/main.py` - Main nesting algorithm logic (lines 3997-4090)
- Previous optimizations:
  - `NESTING_START_PART_PRIORITY_FIX.md` - Part ordering priority
  - `NESTING_PART_FLIPPING_FIX.md` - Initial part flipping for compatibility
  - `NESTING_DENSE_PACKING_OPTIMIZATION.md` - Dense bar packing strategy

