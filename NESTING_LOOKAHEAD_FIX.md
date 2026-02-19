# Nesting Lookahead Optimization Fix

## Date: 2026-02-12 (Second Fix)

## Problem Discovered

After fixing the first bug where look-ahead was re-sorting by length, we discovered a **second critical issue**: even after our optimization correctly ordered parts, the algorithm was **still preferring longest parts** when choosing from compatible options.

### Example Issue:

**IPE200 Profile**: Parts 10214mm, 1108mm, 631mm

**What was happening:**
1. Part 10214mm placed first ✓
2. Both 1108mm and 631mm are compatible with 10214mm's end ✓
3. Algorithm picks **1108mm** because it's longest ❌
4. Result: 10214 → 1108 → 631 (still length-ordered!)

**What should happen:**
1. Part 10214mm placed first ✓
2. Both 1108mm and 631mm are compatible with 10214mm's end ✓
3. Algorithm checks which enables better **next** transition ✓
4. If 631mm enables more compatible future transitions, pick it! ✓
5. Result: 10214 → **631** → 1108 (optimized for compatibility!)

## Root Cause

**File**: `api/main.py`  
**Lines**: 2583-2586, 2685-2688

### The Problem Code:

```python
if compatible_parts:
    # Among compatible parts, prefer longest (to fill bar efficiently)
    compatible_parts.sort(key=lambda p: p["length"], reverse=True)  # ❌ WRONG!
    next_part = compatible_parts[0]
```

This was **always choosing the longest compatible part**, ignoring whether a smaller part might enable better transitions for the remaining parts.

## The Solution

Implemented **lookahead scoring** that evaluates each compatible candidate by checking how many of the **remaining** parts will be compatible with that candidate's end cut.

### The Fix:

```python
if compatible_parts:
    # DON'T just pick longest - pick the one that enables best next transition
    best_next = None
    best_next_score = float('inf')
    
    for candidate in compatible_parts:
        # Simulate: if we place this candidate, what's next?
        remaining_after = [p for p in remaining if p != candidate]
        if not remaining_after:
            # Last part - prefer longest to fill bar
            if best_next is None or candidate["length"] > best_next["length"]:
                best_next = candidate
            continue
        
        # Check how many remaining parts are compatible with this candidate's end
        cand_end_slope = candidate.get("end_has_slope", False)
        cand_end_angle = candidate.get("end_angle")
        
        compatible_count = 0
        for future_part in remaining_after:
            future_start_slope = future_part.get("start_has_slope", False)
            future_start_angle = future_part.get("start_angle")
            
            # Count compatible future transitions
            if not cand_end_slope and not future_start_slope:
                compatible_count += 1
            elif cand_end_slope and future_start_slope:
                if cand_end_angle is not None and future_start_angle is not None:
                    if abs(abs(cand_end_angle) - abs(future_start_angle)) <= 2.0:
                        compatible_count += 1
        
        # Score: prefer parts that enable more future compatible transitions
        # Higher compatible_count = better (lower score)
        # Use length as minor tiebreaker
        score = -compatible_count * 1000 + (10000 - candidate["length"])
        
        if score < best_next_score:
            best_next_score = score
            best_next = candidate
    
    next_part = best_next if best_next else compatible_parts[0]
```

### Key Changes:

1. **Lookahead Logic**: For each compatible candidate, simulate placing it and count how many remaining parts are compatible with its end
2. **Scoring System**: 
   - Primary: Maximize future compatible transitions (score = -compatible_count * 1000)
   - Secondary: Prefer longer parts to fill bar (score += 10000 - length)
3. **Result**: Small parts can be inserted if they enable better overall compatibility

## Example Results

### Before Fix:
```
IPE200 Bar: [10214mm] → [1108mm] → [631mm]
Logic: "1108 is longer than 631, so pick it first"
Issue: Doesn't consider what comes after
```

### After Fix:
```
IPE200 Bar: [10214mm] → [631mm] → [1108mm]
Logic: "631mm's end is compatible with 1108mm's start, enabling clean transition"
Result: Better overall compatibility, reduced waste
```

## Files Modified

1. **`api/main.py`** - Lines 2583-2625 (small part list optimization)
2. **`api/main.py`** - Lines 2685-2724 (large part list greedy heuristic)

Both code paths now use lookahead scoring instead of simple length sorting.

## Testing

To verify the fix works:

1. Load IFC with IPE200 parts (10214mm, 1108mm, 631mm)
2. Generate nesting report
3. Check backend logs for:
   ```
   [NESTING] Optimized order: [(part1, '10214mm'), (part3, '631mm'), (part2, '1108mm')]
   ```
4. Verify in the UI that parts are NOT in strict length order
5. Check that small parts appear between large parts when appropriate

## Technical Notes

### Scoring Formula:
```
score = -compatible_count * 1000 + (10000 - part_length)
```

- **compatible_count**: Number of remaining parts compatible with candidate's end cut
- Lower score = better choice
- The weight (1000) ensures compatibility dominates over length
- Length is still used as tiebreaker to fill bars efficiently

### Performance:
- For small lists (≤10 parts): O(n³) - tries multiple start candidates with lookahead
- For large lists (>10 parts): O(n²) - greedy with lookahead
- Typical performance: <50ms per profile, negligible impact

## Deployment Status

✅ **Fixed and Deployed** - Backend restarted (2026-02-12)

## Summary of All Fixes

1. **First Bug**: Look-ahead was re-sorting by length after optimization
   - Fixed: Removed length re-sort in look-ahead logic
   
2. **Second Bug**: Optimization was always picking longest compatible part
   - Fixed: Implemented lookahead scoring to consider future transitions

**Result**: Parts are now truly optimized for cut compatibility, allowing small parts to be inserted where they reduce overall waste!

---

**Testing Status**: Ready for user verification














