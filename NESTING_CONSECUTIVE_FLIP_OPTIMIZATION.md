# Nesting Algorithm: Consecutive Identical Parts Flip Optimization

## Date
February 14, 2026

## Problem Identified

When consecutive identical parts with slopes were placed on a stock bar, they were sometimes positioned with their sloped edges facing outward, creating unnecessary waste. If these parts were flipped, their sloped edges could align with each other, creating a more optimal nesting arrangement.

### Example Issue

**Before Optimization:**
```
Bar 22: 12000mm stock
┌─────────────────────────────────────────────────────────────┐
│  Part 1  │  Part 1  │  Part 1  │  Part 1  │  Part 2  │      │
│  (2289)  │  (2289)  │  (2289)  │  (2289)  │  (2285)  │ Waste│
│          │          │ /slope   │ /slope   │          │ 616mm│
│          │          │ outward  │ outward  │          │      │
└─────────────────────────────────────────────────────────────┘
```

**Problem:**
- Parts #3 and #4 have their sloped edges facing outward
- This prevents optimal alignment between consecutive identical parts
- Creates unnecessary waste between parts

**After Optimization:**
```
Bar 22: 12000mm stock
┌─────────────────────────────────────────────────────────────┐
│  Part 1  │  Part 1  │  Part 1  │  Part 1  │  Part 2  │      │
│  (2289)  │  (2289)  │  (2289)  │  (2289)  │  (2285)  │ Less │
│          │          │ \slope   │ /slope   │          │ Waste│
│          │          │ aligned  │ aligned  │          │      │
└─────────────────────────────────────────────────────────────┘
```

**Solution:**
- Parts #3 and #4 are flipped so their sloped edges face each other
- Sloped edges can now align and share boundaries
- Reduced waste through better alignment

## Root Cause

The existing flip logic (lines 3500-3535 in `api/main.py`) only checked if flipping a part would help it share a boundary with the **previous** part during the initial placement phase. It didn't consider:

1. **Post-placement optimization**: After all parts are assigned, there was no re-evaluation
2. **Consecutive identical parts**: No special handling for sequences of the same part
3. **Forward-looking alignment**: No checking if flipping would help align with the **next** part

## Solution Implemented

### New Function: `optimize_pattern_flips()`

Added a **post-optimization step** that runs after all parts are assigned to a stock bar but before the pattern is finalized.

**Location**: `api/main.py` (before the nesting route, around line 1879)

**Algorithm:**

1. **Iterate through consecutive parts** in the finalized pattern
2. **Identify identical parts**: Same profile name and similar length (within 1mm)
3. **Check current boundary sharing**: Are the parts already optimally aligned?
4. **If not sharing optimally**:
   - Try flipping the next part
   - Check if flipped alignment would allow boundary sharing
   - If yes, apply the flip
5. **Update slope information** to reflect the flip

### Key Features:

#### 1. Consecutive Part Analysis
```python
for i in range(len(pattern_parts) - 1):
    current_pp = pattern_parts[i]
    next_pp = pattern_parts[i + 1]
```

#### 2. Identical Part Detection
```python
# Only optimize identical parts (same profile and similar length within 1mm)
if current_profile != next_profile or abs(current_length - next_length) > 1.0:
    continue
```

#### 3. Boundary Sharing Check
```python
# Check if current boundary can share
current_can_share = False
if not current_end_slope and not next_start_slope:
    current_can_share = True  # Both straight
elif current_end_slope and next_start_slope:
    # Check if complementary (opposite signs, similar angles)
    if angle_diff <= 2.0:
        if (current_end_angle > 0 and next_start_angle < 0) or \
           (current_end_angle < 0 and next_start_angle > 0):
            current_can_share = True
```

#### 4. Flip Simulation
```python
# Try flipping the NEXT part
flipped_next_start_slope = next_slope.get("end_has_slope", False)
flipped_next_start_angle = next_slope.get("end_angle")

# Check if flipped alignment would allow sharing
can_share_if_next_flipped = # ... check logic
```

#### 5. Apply Flip if Beneficial
```python
if can_share_if_next_flipped:
    # Swap start and end properties
    next_part["start_angle"], next_part["end_angle"] = \
        next_part.get("end_angle"), next_part.get("start_angle")
    next_part["start_has_slope"], next_part["end_has_slope"] = \
        next_part.get("end_has_slope", False), next_part.get("start_has_slope", False)
    next_part["flipped"] = True
```

### Integration Point

**Location**: `api/main.py`, line ~3939 (right before pattern is added to cutting_patterns)

```python
# OPTIMIZATION: Post-process pattern to flip consecutive identical parts for better alignment
pattern_parts = optimize_pattern_flips(pattern_parts, best_stock)

cutting_patterns.append({
    "stock_length": best_stock,
    "parts": pattern_parts,
    "waste": waste,
    "waste_percentage": waste_percentage
})
```

## Benefits

### 1. Reduced Waste
- Consecutive identical parts with slopes can now align their sloped edges
- Eliminates unnecessary gaps between parts
- Maximizes material utilization

### 2. Better Nesting Quality
- More intelligent part placement
- Considers the entire pattern, not just individual part-to-part relationships
- Optimizes after initial placement is complete

### 3. Handles Edge Cases
- Works specifically for identical parts (same profile and length)
- Doesn't interfere with complementary pairs (different parts with matching slopes)
- Only flips when it provides clear benefit

### 4. Maintains Existing Logic
- Post-optimization runs **after** all existing placement logic
- Doesn't break existing complementary pairing
- Additive improvement to the algorithm

## Expected Results

For profiles with consecutive identical parts that have slopes:

**Before:**
- Waste: 616mm (5.13%) on a 12000mm bar
- Parts placed with slopes facing outward

**After:**
- Waste: Reduced (exact amount depends on slope angles and part geometry)
- Parts flipped to align sloped edges
- Better material utilization

## Testing

To test this feature:

1. Upload an IFC file with parts that have sloped cuts
2. Generate nesting report for a profile with multiple identical parts
3. Look for the log message: `[FLIP_OPTIMIZATION] Flipping part at position X to align with previous part`
4. Verify in the nesting visualization that consecutive identical parts have better alignment

## Logging

The optimization logs its actions:

```
[FLIP_OPTIMIZATION] Starting post-optimization for N parts
[FLIP_OPTIMIZATION] Flipping part at position X to align with previous part
[FLIP_OPTIMIZATION] Successfully flipped part {part_id} to create boundary sharing
[FLIP_OPTIMIZATION] Optimization complete - made improvements to pattern
```

Or if no optimization is needed:
```
[FLIP_OPTIMIZATION] No optimization opportunities found
```

## Technical Notes

### Why Post-Optimization?

The flip logic during initial placement (lines 3500-3535) only considers the **previous** part because:
- Parts are placed sequentially
- The **next** part hasn't been selected yet
- Can't look ahead during greedy placement

Post-optimization solves this by:
- Running after **all** parts are placed
- Having full visibility of the entire pattern
- Able to optimize relationships between any consecutive parts

### Complementary Slope Matching

The algorithm uses the same complementary slope logic as the rest of the nesting algorithm:
- Angles must be within 2° of each other
- Must have opposite signs (one positive, one negative)
- Both must have significant slopes (> 1°)

This ensures consistency with the existing pairing logic.

## Future Enhancements

Potential improvements:
1. **Multi-part sequences**: Optimize sequences of 3+ identical parts together
2. **Global optimization**: Consider flipping multiple parts simultaneously
3. **Waste prediction**: Calculate expected waste reduction before applying flip
4. **Configurable threshold**: Allow users to set the angle tolerance for matching

## Related Documentation

- `NESTING_PART_FLIPPING_FIX.md` - Initial flip logic during placement
- `NESTING_DENSE_PACKING_OPTIMIZATION.md` - Overall nesting strategy
- `NESTING_START_PART_PRIORITY_FIX.md` - Starting part selection
- `COMPLEMENTARY_SLOPE_FIX.md` - Complementary slope detection









