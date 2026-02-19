# Nesting Algorithm: Part Flipping for Optimal Compatibility

## Date
February 13, 2026

## Problem
The nesting algorithm was not considering flipping parts to achieve better compatibility, resulting in gaps between identical parts that could have been flushed together.

### Example Issue
For a profile with:
- **Part 1 (b3)**: 2289mm × 4 pieces - one straight end, one sloped end
- **Part 2 (b19)**: 1883mm × 1 piece

**Previous (incorrect) layout:**
```
[b3 #1] → [GAP] → [b3 #2] → [GAP] → [b3 #3] → [GAP] → [b3 #4] → [GAP] → [b19]
```
- All b3 parts placed in same orientation
- Sloped ends didn't match with next part's sloped starts
- Created multiple gaps with waste

**Optimal layout (with flipping):**
```
[b3 #1: straight→slope] → [b3 #2 FLIPPED: slope→straight] → [b3 #3: straight→slope] → [b3 #4 FLIPPED: slope→straight] → [b19]
```
- Alternating orientations create perfect flush connections
- Zigzag pattern where each slope matches the next
- Eliminates all middle gaps

## Root Cause
The algorithm only checked if parts were compatible in their **original orientation**. It never considered that **flipping a part** (reversing start and end) might create a compatible connection.

**Old logic (lines 2604-2621):**
```python
for part in remaining:
    curr_start_slope = part.get("start_has_slope", False)
    curr_start_angle = part.get("start_angle")
    
    # Check compatibility
    is_compatible = False
    if not prev_end_slope and not curr_start_slope:
        is_compatible = True  # Both straight - can flush
    elif prev_end_slope and curr_start_slope:
        # Check if angles match
        ...
    
    if is_compatible:
        compatible_parts.append(part)
    else:
        incompatible_parts.append(part)
```

This meant identical parts (like 4 × b3) were all placed in the same orientation, even when flipping would eliminate waste.

## Solution
Enhanced the compatibility checking to **try both original AND flipped orientations** for each part.

### Key Changes

**1. Check Both Orientations (Small Lists ≤10 parts)**
```python
for part in remaining:
    curr_start_slope = part.get("start_has_slope", False)
    curr_start_angle = part.get("start_angle")
    curr_end_slope = part.get("end_has_slope", False)
    curr_end_angle = part.get("end_angle")
    
    # Check compatibility with ORIGINAL orientation
    is_compatible_original = False
    if not prev_end_slope and not curr_start_slope:
        is_compatible_original = True
    elif prev_end_slope and curr_start_slope:
        if prev_end_angle is not None and curr_start_angle is not None:
            angle_diff = abs(abs(prev_end_angle) - abs(curr_start_angle))
            if angle_diff <= 2.0:
                is_compatible_original = True
    
    # Check compatibility with FLIPPED orientation
    is_compatible_flipped = False
    flipped_start_slope = curr_end_slope
    flipped_start_angle = curr_end_angle
    
    if not prev_end_slope and not flipped_start_slope:
        is_compatible_flipped = True
    elif prev_end_slope and flipped_start_slope:
        if prev_end_angle is not None and flipped_start_angle is not None:
            angle_diff = abs(abs(prev_end_angle) - abs(flipped_start_angle))
            if angle_diff <= 2.0:
                is_compatible_flipped = True
    
    # Add to appropriate list
    if is_compatible_original:
        compatible_parts.append(part)
    elif is_compatible_flipped:
        # Create flipped copy
        flipped_part = part.copy()
        flipped_part["start_angle"], flipped_part["end_angle"] = part.get("end_angle"), part.get("start_angle")
        flipped_part["start_has_slope"], flipped_part["end_has_slope"] = part.get("end_has_slope", False), part.get("start_has_slope", False)
        flipped_part["flipped"] = True
        flipped_part["original_part_id"] = part.get("product_id")
        compatible_parts.append(flipped_part)
        nesting_log(f"[NESTING] Part {part.get('part_name', 'unknown')} will be FLIPPED")
    else:
        incompatible_parts.append(part)
```

**2. Handle Flipped Parts When Removing from Remaining**
```python
ordering.append(next_part)
# Remove the part from remaining (handle flipped parts)
if next_part.get("flipped", False):
    # This is a flipped part - remove the original part by product_id
    original_id = next_part.get("original_part_id")
    remaining = [p for p in remaining if p.get("product_id") != original_id]
else:
    # Normal part - remove directly
    if next_part in remaining:
        remaining.remove(next_part)
```

**3. Handle Flipped Parts in Future Compatibility Checks**
```python
for candidate in compatible_parts:
    # Handle flipped parts when calculating remaining_after
    if candidate.get("flipped", False):
        candidate_id = candidate.get("original_part_id")
        remaining_after = [p for p in remaining if p.get("product_id") != candidate_id]
    else:
        remaining_after = [p for p in remaining if p != candidate]
```

## Benefits
1. **Eliminates gaps between identical parts**: Parts can now be flipped to match each other perfectly
2. **Creates optimal zigzag patterns**: Alternating orientations allow slopes to flush together
3. **Preserves all existing logic**: Flipping is only used when it improves compatibility
4. **Works with all part types**: Applies to both small (≤10) and large (>10) part lists
5. **Maintains priority rules**: Still respects straight-both-sides > straight-start-only > slope-start priority

## Implementation Details

### Locations Modified
1. **Lines 2604-2649**: Small list compatibility checking with flipping
2. **Lines 2712-2720**: Small list part removal handling for flipped parts
3. **Lines 2659-2667**: Small list future compatibility checking for flipped parts
4. **Lines 2911-2948**: Large list compatibility checking with flipping
5. **Lines 2993-3001**: Large list part removal handling for flipped parts
6. **Lines 2958-2966**: Large list future compatibility checking for flipped parts

### Flipped Part Tracking
- `flipped`: Boolean flag indicating the part is flipped
- `original_part_id`: Product ID of the original part (for removal from remaining list)
- Start/end angles and slopes are swapped when creating flipped copy

## Testing
Test with the example profile (SHS60*60*3.0):
- Part 1 (b3): 2289mm × 4 pieces
- Part 2 (b19): 1883mm × 1 piece
- Stock: 12.00m

Expected result: 
- b3 parts should alternate in orientation (original, flipped, original, flipped)
- All parts should flush together with no gaps
- Waste should be minimized to only unavoidable end waste

## Files Modified
- `api/main.py` - Added flipping logic to compatibility checking (6 locations)

## Related Features
- Works with existing straight-both-sides priority fix
- Compatible with brute-force optimization for small patterns
- Integrates with complementary slope detection
- Maintains all existing waste calculation logic













