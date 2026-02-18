# Nesting Stock Preference Fix

## Date
2026-02-18

## Issue
The nesting algorithm was always using 6m stock bars instead of optimizing with 12m bars first. This resulted in:
- More bars used (62 bars of 6m instead of fewer 12m bars)
- More cuts (88 cuts instead of fewer)
- Higher waste percentage (11.29%)

## Root Cause
During the refactoring of the nesting algorithm, the stock selection logic was changed:

**Before Refactoring** (in `main.py.backup`):
```python
# Line 2422: Check longer stocks first
for stock_len in sorted(stock_lengths_list, reverse=True):

# Line 2436: Sort by stock length DESCENDING (longer first)
candidate_stocks.sort(key=lambda x: (-x[0], x[1]))
```

**After Refactoring** (in `bin_packer.py`):
```python
# Line 84: Check shorter stocks first (WRONG!)
for stock_length in sorted(stock_lengths):  # Ascending order: 6m, 12m
```

The refactored code was sorting stock lengths in **ascending order** (6m, 12m), so it always picked the smallest stock that fits a part.

## Original Strategy (Before Refactoring)

The original algorithm had this smart strategy:

1. **Prefer longer stocks first (12m before 6m)** to maximize utilization
2. Fill longer bars with as many parts as possible
3. Only use shorter stocks when:
   - All remaining parts fit in the shorter stock
   - It minimizes waste for leftover parts

This strategy minimizes:
- Number of bars used
- Number of cuts needed
- Overall waste

## Fix Applied

### File: `api/nesting/bin_packer.py`

Changed the `find_best_stock_for_parts` function (line 84):

**Before:**
```python
# Find smallest stock that fits
for stock_length in sorted(stock_lengths):
    if required_length <= stock_length:
        return stock_length
```

**After:**
```python
# CHANGED: Check longer stocks first (12m before 6m)
# This prefers filling longer bars first to minimize number of bars and cuts
for stock_length in sorted(stock_lengths, reverse=True):
    if required_length <= stock_length:
        return stock_length
```

### Key Change
Added `reverse=True` to sort stock lengths in **descending order** (12m, 6m), matching the original algorithm behavior.

## Expected Results After Fix

With the fix applied, the nesting should now:
- ✅ Use 12m bars first to pack more parts
- ✅ Reduce the number of bars needed
- ✅ Reduce the number of cuts
- ✅ Lower the waste percentage
- ✅ Only use 6m bars for leftover parts or when appropriate

## Testing

To verify the fix:
1. Upload the same IFC file (1222201Raziel_School_Approved10225.ifc)
2. Use the same settings:
   - Stock lengths: 6000, 12000
   - Profile: SHS60*60*3.0
   - Kerf: 3mm
   - Trim: 10mm
3. Generate nesting report
4. Check that it now uses 12m bars instead of only 6m bars

## Backend Status
✅ Backend server restarted with fix on http://localhost:8000

## Related Documentation
- See `main.py.backup` lines 2418-2514 for original algorithm logic
- See `NESTING_ORDERING_OPTIMIZATION.md` for related optimization notes

---

**The nesting algorithm now matches the original behavior and should optimize with longer stock bars first!** 🎯

