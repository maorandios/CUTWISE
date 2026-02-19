# Nesting Algorithm: Dense Packing Optimization

## Problem
The nesting algorithm was creating too many bars with moderate waste instead of consolidating waste into fewer bars. 

### Example Issue:
- **Before**: 7 bars, each with ~2563mm waste (21% waste per bar)
- **Pattern**: Each bar had 1 complementary pair + 2 large parts
- **Result**: Many bars with distributed waste

## Root Cause
The algorithm was **pairing complementary slopes at the start of EVERY bar**, which meant:
1. Each bar started with a complementary pair (~1950mm)
2. Only 2-3 large parts could fit after the pair
3. This created many bars with similar waste patterns
4. Smaller parts couldn't be used to fill gaps because they were already paired

## Solution Implemented

### 1. Conditional Complementary Pairing
**Location**: `api/main.py` around line 3137-3165

**Strategy**: Don't pair complementary slopes at the start of every bar. Instead:
- **Skip pairing** when there are many parts remaining (> 20 parts)
- **Enable pairing** only when:
  - Few parts remain (≤ 20 parts), OR
  - Pattern is nearly full and remaining space is small (< 3000mm)

**Code Changes**:
```python
# OPTIMIZATION STRATEGY: Skip complementary pairing when there are many parts
should_pair_complementary = False

if len(remaining_parts) <= 20:
    # Few parts left - start using complementary pairs
    should_pair_complementary = True
    nesting_log(f"[NESTING] PAIRING STRATEGY: Few parts remaining ({len(remaining_parts)}), enabling complementary pairing")
elif current_length > 0 and (best_stock - current_length) < 3000:
    # Pattern already has parts and remaining space is small - try to fit a pair
    should_pair_complementary = True
    nesting_log(f"[NESTING] PAIRING STRATEGY: Small remaining space ({best_stock - current_length:.0f}mm), enabling complementary pairing")
else:
    # Many parts remaining - fill with regular parts first
    nesting_log(f"[NESTING] PAIRING STRATEGY: Many parts remaining ({len(remaining_parts)}), skipping complementary pairing to maximize bar density")

complementary_pairs = []
if should_pair_complementary and len(valid_parts_for_this_stock) >= 2:
    # ... existing complementary pairing logic ...
```

### 2. Enhanced Backfill Logic
**Location**: `api/main.py` around line 4126-4155

**Improvement**: Made backfill more aggressive by:
- Checking **ALL remaining parts**, not just those in `valid_parts_for_this_stock`
- Removing the restrictive check that prevented smaller parts from being considered
- Allowing any part that fits in the remaining space to be added

**Code Changes**:
```python
# Sort ALL remaining parts by length (smallest first for backfill)
# IMPORTANT: Check all remaining_parts, not just valid_parts_for_this_stock
remaining_parts_by_size = sorted(remaining_parts, key=lambda p: p["length"])

for part in remaining_parts_by_size:
    if part in parts_to_remove:
        continue
    
    part_length = part["length"]
    
    # Skip parts that are too large for this stock
    if part_length > best_stock:
        continue
    
    kerf_mm = 3.0
    needed_space = part_length + kerf_mm
    
    # Check if this part fits in remaining space
    if needed_space <= remaining_space + tolerance_mm:
        # Add the part to fill the gap
```

## Expected Results

### Bar Utilization
- **Early bars**: Filled with 3-4 large parts (11000-12000mm utilization)
- **Middle bars**: Continued dense packing with regular parts
- **Final bars**: Use complementary pairs to efficiently handle remaining parts

### Waste Distribution
- **Before**: 7 bars × 2563mm waste = ~17,941mm total waste distributed
- **After**: Fewer bars (5-6) with consolidated waste in the last 1-2 bars

### Benefits
1. ✅ **Fewer total bars needed** - Better material utilization
2. ✅ **Consolidated waste** - Easier to manage leftover material
3. ✅ **Maintained complementary pairing** - Still saves material on sloped cuts
4. ✅ **Smarter pairing timing** - Pairs are used when they provide maximum benefit

## Testing
To test the optimization:
1. Navigate to `http://localhost:5180/`
2. Upload an IFC file with many parts (e.g., the file with b1011, b1218, b1009 parts)
3. Run nesting with stock lengths 6000mm and 12000mm
4. Observe:
   - First bars should be densely packed with large parts
   - Complementary pairs should appear in later bars
   - Total number of bars should be reduced
   - Waste should be consolidated into fewer bars

## Implementation Date
February 13, 2026

## Related Files
- `api/main.py` - Main nesting algorithm logic
- Previous optimizations:
  - `NESTING_START_PART_PRIORITY_FIX.md` - Part ordering priority
  - `NESTING_PART_FLIPPING_FIX.md` - Part flipping for compatibility













