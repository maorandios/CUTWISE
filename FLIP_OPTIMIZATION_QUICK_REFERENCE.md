# Flip Optimization - Quick Reference

## What Was Fixed?

**Problem**: Consecutive identical parts (#3 and #4) were placed with slopes facing outward, creating unnecessary waste.

**Solution**: Added post-optimization that flips consecutive identical parts to align their sloped edges.

## How to See It in Action

1. **Open the app**: http://localhost:5180
2. **Upload IFC file** with parts that have sloped cuts
3. **Generate nesting** for a profile with multiple identical parts
4. **Look for improvements** in consecutive part alignment

## What to Look For

### In the Logs:
```
[FLIP_OPTIMIZATION] Starting post-optimization for N parts
[FLIP_OPTIMIZATION] Flipping part at position X to align with previous part
[FLIP_OPTIMIZATION] Successfully flipped part {part_id} to create boundary sharing
[FLIP_OPTIMIZATION] Optimization complete - made improvements to pattern
```

### In the Visualization:
- Consecutive identical parts with slopes should have their sloped edges aligned
- Better boundary sharing between parts
- Reduced waste in the red-highlighted sections

## Visual Example

### Before:
```
┌────────────────────────────────────────────────┐
│ Part 1 │ Part 1 │ Part 1 │ Part 1 │ Part 2 │  │
│        │        │   /    │   /    │        │  │ ← Slopes facing outward
│        │        │  (3)   │  (4)   │        │  │
└────────────────────────────────────────────────┘
```

### After:
```
┌────────────────────────────────────────────────┐
│ Part 1 │ Part 1 │ Part 1 │ Part 1 │ Part 2 │  │
│        │        │   \    │   /    │        │  │ ← Slopes aligned!
│        │        │  (3)   │  (4)   │        │  │
└────────────────────────────────────────────────┘
```

## When Does It Apply?

✅ Consecutive parts (next to each other)
✅ Identical parts (same profile and length)
✅ Parts with slopes that aren't already aligned
✅ When flipping would create better alignment

❌ Non-consecutive parts
❌ Different parts (different profiles or lengths)
❌ Parts already optimally aligned
❌ When flipping wouldn't help

## Technical Details

**File**: `C:\CUTWISE\api\main.py`
**Function**: `optimize_pattern_flips()` (line ~1879)
**Integration**: Line ~3941 (before pattern finalization)

**Criteria**:
- Profile names must match exactly
- Lengths must be within 1mm
- Angles must be within 2° for complementary matching
- Slopes must have opposite signs to be complementary

## Expected Results

- **Reduced waste** on bars with consecutive identical parts
- **Better alignment** of sloped edges
- **Improved material utilization**
- **No impact** on non-identical parts or existing complementary pairs

## Server Info

- **Frontend**: http://localhost:5180
- **Backend**: http://localhost:8000
- **Status**: ✅ Running with optimization active

## Documentation

- **Full Details**: `NESTING_CONSECUTIVE_FLIP_OPTIMIZATION.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY_FLIP_OPTIMIZATION.md`
- **This Guide**: `FLIP_OPTIMIZATION_QUICK_REFERENCE.md`

## Testing Checklist

- [ ] Upload IFC file with sloped parts
- [ ] Generate nesting for profile with multiple identical parts
- [ ] Check backend logs for flip optimization messages
- [ ] Verify consecutive identical parts are better aligned
- [ ] Compare waste percentages

## Need Help?

Check the logs for:
- `[FLIP_OPTIMIZATION]` messages - shows when optimization runs
- `[NESTING]` messages - shows overall nesting process
- Any error messages - indicates issues to investigate

---

**Last Updated**: February 14, 2026
**Feature Status**: ✅ Active and Running




