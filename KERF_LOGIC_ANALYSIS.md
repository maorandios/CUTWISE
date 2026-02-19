# Kerf Logic Analysis

## User's Issue
Two parts of 6000mm each cannot fit in a 12000mm stock bar with 3mm kerf.

## Current Logic
```
Part 1: 6000mm
Kerf: 3mm (if boundaries can't share)
Part 2: 6000mm
Total: 12003mm > 12000mm → REJECTED
```

## The Question
Should two 6000mm parts fit in 12000mm stock with 3mm kerf?

### Option 1: YES - Kerf is spacing, not material loss
If kerf is just "spacing" between parts for safety:
- Part 1: 6000mm
- Gap: 3mm
- Part 2: 6000mm  
- Total: 12003mm
- **Problem:** Exceeds 12000mm stock

### Option 2: NO - Kerf is material removed by cutting
If kerf is material LOST to the cutting blade:
- Start with 12000mm bar
- Cut part 1 (6000mm) - remaining: 6000mm
- Make cut (3mm kerf removed) - remaining: 5997mm
- Can't get 6000mm part from 5997mm!
- **This is physically correct**

### Option 3: Parts can share boundary (kerf = 0)
If both parts have straight cuts on both ends:
- They can share the same cut boundary
- No kerf needed between them
- Part 1: 6000mm + Part 2: 6000mm = 12000mm ✓

## Investigation Needed
Check if RHS500*300*20.0 parts have:
- Straight cuts on both ends? → kerf = 0 (should fit)
- Sloped cuts? → kerf = 3mm (won't fit)

## Solution
The algorithm is working correctly IF parts have incompatible cuts.
The issue might be that parts with straight cuts are incorrectly getting kerf applied.





