# Nesting Algorithm Fix: Alternating Flip Pattern for All Identical Parts

## Date
February 14, 2026

## Problem Identified

The nesting algorithm was only flipping the **first pair** of consecutive identical parts with slopes, but not continuing the alternating pattern for subsequent identical parts. This resulted in suboptimal nesting with unnecessary waste.

### Example Issue

**Before Fix:**
```
Bar 23: 12000mm stock
┌─────────────────────────────────────────────────────────────┐
│  Part 1  │  Part 2  │  Part 3  │  Part 4  │  Part 5  │      │
│  b3      │  b3      │  b3      │  b3      │  b36     │ Waste│
│  (2289)  │  (2289)  │  (2289)  │  (2289)  │  (2285)  │ 616mm│
│  /slope  │  \slope  │  /slope  │  /slope  │          │      │
│          │  FLIPPED │  NOT     │  NOT     │          │      │
│          │          │  FLIPPED │  FLIPPED │          │      │
└─────────────────────────────────────────────────────────────┘
```

**Problem:**
- Parts #1 and #2: Algorithm correctly flips part #2 to create complementary slopes ✅
- Parts #2 and #3: Algorithm sees they "already share" boundaries (part #2's end is complementary to part #3's start) and skips flipping ❌
- Parts #3 and #4: Same problem - skips flipping ❌
- Result: Only the first pair gets optimized, rest have suboptimal alignment

**After Fix:**
```
Bar 23: 12000mm stock
┌─────────────────────────────────────────────────────────────┐
│  Part 1  │  Part 2  │  Part 3  │  Part 4  │  Part 5  │      │
│  b3      │  b3      │  b3      │  b3      │  b36     │ Less │
│  (2289)  │  (2289)  │  (2289)  │  (2289)  │  (2285)  │ Waste│
│  /slope  │  \slope  │  /slope  │  \slope  │          │      │
│          │  FLIPPED │  NOT     │  FLIPPED │          │      │
│          │          │  FLIPPED │          │          │      │
└─────────────────────────────────────────────────────────────┘
```

**Solution:**
- Alternating pattern: Original → Flipped → Original → Flipped
- All consecutive identical parts get the alternating treatment
- Maximum boundary sharing throughout the entire sequence

## Root Cause

The `optimize_pattern_flips()` function in `api/main.py` had logic that would:

1. **Detect same-sign slopes** between parts #1 and #2
2. **Flip part #2** to create complementary slopes ✅
3. **Check parts #2 and #3**: See that part #2's end (now flipped) is complementary to part #3's start
4. **Conclude "already sharing"** and skip optimization ❌
5. **Miss the opportunity** to continue the alternating pattern

The key issue was at **lines 1952-1954**:

```python
# If already sharing, skip
if current_can_share:
    continue
```

This logic didn't account for the fact that continuing an alternating flip pattern for identical parts would be better than just accepting the current "sharing" state.

## Solution Implemented

### Changes to `optimize_pattern_flips()` function

**Location**: `api/main.py`, lines 1879-2047

### Key Enhancements:

#### 1. Track Alternating Sequences
Added state tracking variables:

```python
# Track if we're in an alternating pattern sequence for identical parts
in_alternating_sequence = False
last_flipped = False
```

#### 2. Identify Identical Parts
Enhanced part comparison to check both profile AND length:

```python
# Parts are identical if same profile and length within 1mm
are_identical = (current_profile == next_profile and abs(current_length - next_length) <= 1.0)
```

#### 3. Continue Alternating Pattern
New logic block that runs BEFORE the "already sharing" check:

```python
# NEW: If we're in an alternating sequence with identical parts, continue the pattern
if in_alternating_sequence and are_identical:
    # Continue alternating: if last was flipped, don't flip this one; if last wasn't flipped, flip this one
    should_flip_next = not last_flipped
    
    if should_flip_next:
        # Flip the next part
        # ... flip logic ...
        last_flipped = True
        continue
    else:
        # Keep original orientation
        last_flipped = False
        continue
```

#### 4. Start Alternating Sequence
When detecting same-sign slopes in identical parts, set the sequence flag:

```python
if same_sign:
    # ... flip logic ...
    in_alternating_sequence = True  # NEW: Mark that we're in a sequence
    last_flipped = True
    continue
```

#### 5. Reset Sequence on Different Parts
When parts are no longer identical or the pattern breaks:

```python
if current_profile != next_profile:
    in_alternating_sequence = False
    continue
```

## Algorithm Flow

### For Consecutive Identical Parts with Slopes:

1. **Part 1 → Part 2**:
   - Detect: Both have slopes with same sign
   - Action: Flip part #2
   - State: `in_alternating_sequence = True`, `last_flipped = True`

2. **Part 2 → Part 3**:
   - Detect: In alternating sequence, parts are identical
   - Check: `last_flipped = True`, so `should_flip_next = False`
   - Action: Keep part #3 in original orientation
   - State: `last_flipped = False`

3. **Part 3 → Part 4**:
   - Detect: In alternating sequence, parts are identical
   - Check: `last_flipped = False`, so `should_flip_next = True`
   - Action: Flip part #4
   - State: `last_flipped = True`

4. **Part 4 → Part 5** (different part):
   - Detect: Parts not identical
   - Action: Exit alternating sequence
   - State: `in_alternating_sequence = False`

## Benefits

### 1. Complete Optimization
- ALL consecutive identical parts with slopes get optimized
- Not just the first pair

### 2. Consistent Alternating Pattern
- Creates a predictable zigzag pattern: Original → Flipped → Original → Flipped
- Maximizes boundary sharing throughout the entire sequence

### 3. Reduced Waste
- Better material utilization across the entire stock bar
- Eliminates gaps between all identical consecutive parts

### 4. Maintains Existing Logic
- Non-identical parts still use the original optimization logic
- Backward compatible with existing nesting behavior

## Testing

To test the fix:

1. Upload an IFC file with multiple identical parts that have slopes
2. Generate a nesting report
3. Observe the cutting pattern visualization
4. Verify that ALL consecutive identical parts show the alternating flip pattern
5. Check that waste percentage is reduced compared to before

## Logging

The algorithm now logs additional information:

```
[FLIP_OPTIMIZATION] Alternating sequence: in_sequence=True, last_flipped=True
[FLIP_OPTIMIZATION] Continuing alternating pattern - flipping next identical part
[FLIP_OPTIMIZATION] Successfully flipped part b3 to continue alternating pattern
```

This helps debug and verify the alternating pattern is being applied correctly.

## Summary

**Problem**: Only first pair of identical parts was flipped, rest were skipped
**Root Cause**: "Already sharing" check prevented continuation of alternating pattern
**Solution**: Track alternating sequences and continue the pattern for all identical consecutive parts
**Result**: All identical parts get optimized with alternating flips, reducing waste

The fix ensures that the nesting algorithm now properly handles long sequences of identical parts with slopes, creating optimal alternating patterns throughout the entire stock bar.

