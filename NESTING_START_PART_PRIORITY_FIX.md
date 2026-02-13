# Nesting Algorithm: Start Part Priority Fix

## Date
February 13, 2026

## Problem
The nesting algorithm was placing parts in suboptimal order, creating unnecessary waste in the middle of stock bars.

### Example Issue
For a profile with:
- **Part 1 (b27)**: 8000mm - one straight end, one sloped end
- **Part 2 (c2)**: 2812mm - both ends straight

**Previous (incorrect) layout:**
```
[Part 1: straight start | ... | sloped end] → [WASTE] → [Part 2: straight | straight]
```
- Created waste in the middle due to slope-to-straight transition
- Total waste: ~1.19m (9.88%)

**Optimal layout:**
```
[Part 2: straight | straight] → [Part 1: straight | ... | sloped end]
```
- Part 2 placed first
- Part 1's straight end flushes perfectly with Part 2's straight end
- Part 1's sloped end goes to the end of the bar (unavoidable end waste only)
- Minimized waste by eliminating middle transitions

## Root Cause
The algorithm was prioritizing parts by **length** when selecting the starting part, always placing the longest part first regardless of cut characteristics.

**Old logic (line 2563):**
```python
start_candidates = sorted(straight_start_parts, key=lambda p: p["length"], reverse=True)[:3]
```

This meant Part 1 (8000mm) was always chosen over Part 2 (2812mm), even though Part 2 has better cut characteristics (straight on both ends).

## Solution
Implemented a **priority-based selection** for starting parts:

### Priority Order:
1. **Straight-both-sides parts** (e.g., Part 2) - Most flexible, can flush on both sides
2. **Straight-start-only parts** (e.g., Part 1) - One slope end
3. **Slope-start parts** - Last resort

### Code Changes

**Location 1: Small part lists (≤10 parts) - Lines 2555-2586**
```python
# PRIORITY ORDER for starting parts:
# 1. Parts with straight cuts on BOTH ends (most flexible)
# 2. Parts with straight start only (one slope end)
# 3. Parts with slope start (as last resort)

straight_both_sides = [p for p in parts if not p.get("start_has_slope", False) and not p.get("end_has_slope", False)]
straight_start_only = [p for p in parts if not p.get("start_has_slope", False) and p.get("end_has_slope", False)]
slope_start_parts = [p for p in parts if p.get("start_has_slope", False)]

start_candidates = []

# Priority 1: Straight-both-sides parts
if straight_both_sides:
    start_candidates.extend(sorted(straight_both_sides, key=lambda p: p["length"], reverse=True)[:2])

# Priority 2: Straight-start-only parts
if straight_start_only:
    start_candidates.extend(sorted(straight_start_only, key=lambda p: p["length"], reverse=True)[:2])

# Priority 3: Slope-start parts (last resort)
if slope_start_parts and not start_candidates:
    start_candidates.extend(sorted(slope_start_parts, key=lambda p: p["length"], reverse=True)[:2])
```

**Location 2: Large part lists (>10 parts) - Lines 2838-2862**
Applied the same priority logic for larger part lists using a simpler greedy heuristic.

## Benefits
1. **Reduced waste**: Straight-both-sides parts act as "adapters" between slope-cut parts
2. **Better optimization**: Cut characteristics now prioritized over part length
3. **Smarter placement**: Sloped ends pushed to bar ends where waste is unavoidable anyway
4. **Consistent logic**: Same priority order applied to both small and large part lists

## Testing
Test with the example profile (SHS100*100*4.0):
- Part 1 (b27): 8000mm
- Part 2 (c2): 2812mm
- Stock: 12.00m

Expected result: Part 2 should be placed first, followed by Part 1, minimizing waste.

## Files Modified
- `api/main.py` - Updated nesting algorithm start part selection logic

## Related Issues
- Addresses user feedback about suboptimal part ordering
- Complements existing brute-force optimization for small patterns
- Works with existing slope detection and compatibility checking

