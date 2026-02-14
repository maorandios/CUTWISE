# Nesting Algorithm Fix: Part Reordering to Minimize Waste

## Date
February 14, 2026

## Problem Identified

Parts were being placed in the order they were selected (greedy algorithm), which sometimes resulted in parts with unpaired end slopes being placed in the **middle** of the stock bar, creating unnecessary waste between parts.

### Example Issue

**Before Fix:**
```
Bar 19: 12000mm stock
┌────────────────────────────────────────────────────────────┐
│  Part 1 (b1015)  │  WASTE  │  Part 2 (c1001)  │  Part 2  │ WASTE │
│     6263mm       │   GAP   │     2602mm       │  2602mm  │  530mm│
│  straight→slope  │         │  straight→str    │  str→str │       │
└────────────────────────────────────────────────────────────┘
```

**Problem:**
- Part 1 (b1015) has a sloped end that doesn't match Part 2's straight start
- This creates **waste in the middle** of the bar (gap between parts)
- Additional **waste at the end** of the bar (unavoidable)
- Total waste: 530mm (4.41%)

**After Fix:**
```
Bar 19: 12000mm stock (optimized)
┌────────────────────────────────────────────────────────────┐
│  Part 2 (c1001)  │  Part 2 (c1001)  │  Part 1 (b1015)    │ WASTE │
│     2602mm       │     2602mm       │     6263mm         │ merged│
│  straight→str    │  straight→str    │  straight→slope    │ with  │
│                  │                  │                    │ slope │
└────────────────────────────────────────────────────────────┘
```

**Solution:**
- Part 2 (c1001 × 2) placed first (even though smaller than Part 1)
- Part 1 (b1015) moved to the end
- Part 1's sloped end now **merges with the unavoidable end waste**
- **No waste in the middle** of the bar
- Reduced total waste

## Root Cause

The greedy algorithm in the nesting process (lines 3688-3850 in `api/main.py`) adds parts in the order they appear in the sorted list. This order prioritizes:
1. Flushable parts (can share boundary with previous part)
2. Parts sorted by length (longest first)

However, this doesn't consider the **global optimization** of where parts with unpaired end slopes should be positioned. A part with an unpaired end slope in the middle creates waste, but the same part at the end of the bar has its slope merge with the unavoidable end waste.

## Solution Implemented

### New Step in `optimize_pattern_flips()`

Added a **part reordering step** that runs AFTER parts are assigned but BEFORE the pattern is finalized.

**Location**: `api/main.py`, lines 1897-1990

### Algorithm:

#### Step 1: Analyze Each Part's End
```python
for i, pp in enumerate(pattern_parts):
    end_has_slope = slope_info.get("end_has_slope", False)
    
    if end_has_slope and i < len(pattern_parts) - 1:
        # Check if next part can share boundary
        next_start_has_slope = next_slope_info.get("start_has_slope", False)
        
        # Check if complementary or both straight
        can_share = check_boundary_sharing(...)
        
        if not can_share:
            has_unpaired_end = True
```

#### Step 2: Classify Parts
- **Parts with paired/straight ends**: Can share boundary with next part OR have straight end
- **Parts with unpaired end slopes**: End slope creates waste (gap) with next part

#### Step 3: Reorder Pattern
```python
# Reorder: paired/straight ends first, unpaired end slopes last
reordered_parts = []

# Add parts with paired or straight ends first
for idx, pp in parts_with_paired_or_straight_end:
    reordered_parts.append(pp)

# Add parts with unpaired end slopes last
for idx, pp in parts_with_unpaired_end_slope:
    reordered_parts.append(pp)
```

#### Step 4: Recalculate Positions
```python
current_position = 0
for pp in reordered_parts:
    pp["cut_position"] = current_position
    part_length = pp.get("length", 0)
    current_position += part_length
```

## Key Features

### 1. Global Optimization
- Looks at the entire pattern, not just consecutive pairs
- Identifies parts that would create waste in the middle
- Repositions them to the end where waste is unavoidable anyway

### 2. Preserves Part Selection
- Doesn't change which parts are assigned to the bar
- Only changes the **order** of already-assigned parts
- Works with the existing greedy algorithm

### 3. Minimizes Middle Waste
- Parts with unpaired end slopes go to the end
- Their sloped ends merge with the end waste
- Eliminates gaps in the middle of the bar

### 4. Enhanced Logging
```
[FLIP_OPTIMIZATION] Analyzing part order to minimize waste...
[FLIP_OPTIMIZATION] Part 0 (b1015) has unpaired end - creates waste with next part
[FLIP_OPTIMIZATION] Found 1 parts with unpaired end slopes not at the end
[FLIP_OPTIMIZATION] Reordering: parts with paired/straight ends first, unpaired end slopes last
[FLIP_OPTIMIZATION]   -> Keeping part c1001 at beginning (paired/straight end)
[FLIP_OPTIMIZATION]   -> Keeping part c1001 at beginning (paired/straight end)
[FLIP_OPTIMIZATION]   -> Moving part b1015 to end (unpaired end slope)
[FLIP_OPTIMIZATION] Successfully reordered parts - unpaired end slopes moved to end of bar
```

## Benefits

### 1. Reduced Waste
- Eliminates waste in the middle of stock bars
- Unpaired slopes merge with unavoidable end waste
- Better material utilization

### 2. Optimal Part Placement
- Smaller parts can be placed before larger parts if it reduces waste
- Length is no longer the only priority
- Cut compatibility is prioritized

### 3. Works with Existing Optimizations
- Runs after part assignment, before flip optimization
- Compatible with alternating flip patterns
- Integrates seamlessly with existing logic

### 4. Automatic Detection
- No manual intervention needed
- Automatically identifies problematic patterns
- Applies optimization when beneficial

## Example Results

### Case 1: RHS100X100X5 Profile
**Before:**
- Part 1 (b1015, 6263mm) → Part 2 (c1001, 2602mm × 2)
- Waste: 530mm (4.41%)
- Gap in middle + end waste

**After:**
- Part 2 (c1001, 2602mm × 2) → Part 1 (b1015, 6263mm)
- Waste: Reduced (slope merges with end)
- No gap in middle

### Case 2: Multiple Parts
**Before:**
- Large part with slope → Small part → Small part → End waste
- Multiple gaps in middle

**After:**
- Small parts → Small parts → Large part with slope → End waste
- All slopes at end, no middle gaps

## Testing

To verify the fix:

1. Upload an IFC file with parts that have different cut characteristics
2. Generate a nesting report
3. Check the backend logs for:
   ```
   [FLIP_OPTIMIZATION] Part X has unpaired end - creates waste with next part
   [FLIP_OPTIMIZATION] Reordering: parts with paired/straight ends first, unpaired end slopes last
   [FLIP_OPTIMIZATION] Moving part X to end (unpaired end slope)
   ```
4. Verify in the visualization that parts are reordered optimally
5. Check that waste percentage is reduced

## Integration with Other Optimizations

This reordering step runs **before** the alternating flip optimization, so:

1. **Part Reordering** (this fix) - Moves unpaired-end parts to the end
2. **Alternating Flip Pattern** (previous fix) - Flips consecutive identical parts
3. **First Part Optimization** - Ensures first part starts with straight cut

All three optimizations work together to minimize waste throughout the entire stock bar.

## Summary

**Problem**: Parts with unpaired end slopes in the middle create waste gaps  
**Root Cause**: Greedy algorithm doesn't consider global part positioning  
**Solution**: Reorder parts after assignment - unpaired end slopes go to the end  
**Result**: Slopes merge with end waste, no middle gaps, reduced total waste

This fix ensures optimal part placement regardless of part size, prioritizing cut compatibility over length for better material utilization!

