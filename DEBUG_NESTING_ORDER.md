# Debug: Nesting Order Issue

## Problem
UPN220 profile still showing 24.47% waste on Bar 2, suggesting parts are not being ordered optimally.

## Expected Behavior
- Straight-cut parts should be placed first
- Sloped-cut parts should be at the end
- This minimizes gaps between incompatible cuts

## What to Check

### 1. Backend Logs
Check the backend console window for these log messages:
```
[NESTING] Smart ordering: X straight-both, Y straight-start, Z straight-end, W sloped-both
```

This will tell us if the smart ordering is being applied.

### 2. Part Placement Order
Look for log messages like:
```
[NESTING] Added part XXX (4200mm) + kerf (3.0mm) to pattern
```

The order of these messages shows the actual placement order.

### 3. Part Cut Characteristics
For UPN220, we need to know:
- Which parts have straight cuts on both ends?
- Which parts have sloped cuts?
- What are the part names and lengths?

## Hypothesis

The issue might be that:
1. Parts don't have cut information (start_has_slope, end_has_slope) set correctly
2. All parts are being classified as "straight-both" or all as "sloped-both"
3. The complementary pairing logic is overriding the smart ordering

## Next Steps

1. Check backend logs during nesting generation
2. Verify that parts have correct slope information
3. Add more detailed logging to show which category each part falls into




