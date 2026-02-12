# Debug Logging Added for Complementary Slope Detection

## Date: 2026-02-12

## What Was Added

I've added comprehensive debug logging to understand why the optimizer isn't detecting complementary slopes between parts 4 (c1050) and 5 (c1041) in your RHS120X120X5 pattern.

### Debug Logs Added:

1. **Part Slope Information** (for each part in the pattern):
   ```
   [OPTIMIZATION DEBUG] Part 1 (c1030): start_slope=False (None°), end_slope=False (None°)
   [OPTIMIZATION DEBUG] Part 2 (c1038): start_slope=False (None°), end_slope=False (None°)
   ... and so on
   ```

2. **Slope Detection Summary**:
   ```
   [OPTIMIZATION DEBUG] Found X parts with end slopes, Y parts with start slopes
   ```

3. **Pairwise Angle Comparison** (for each potential pair):
   ```
   [OPTIMIZATION DEBUG] Checking: c1050 (end=42.0°) vs c1041 (start=-42.0°), diff=0.0°
   [OPTIMIZATION DEBUG] Angles similar (diff=0.0°), opposite_signs=True
   ```

4. **Complementary Pair Testing**:
   ```
   [OPTIMIZATION] Potential complementary pair found! Testing arrangement...
   [OPTIMIZATION DEBUG] After moving c1041 next to c1050: waste=380.0mm (original=492.0mm)
   ```

5. **Success/Failure Messages**:
   ```
   [OPTIMIZATION] ✓ Found complementary pair: c1050 (end=42.0°) + c1041 (start=-42.0°)
   [OPTIMIZATION] ✓ Waste improved: 492.0mm -> 380.0mm (saved 112.0mm)
   ```

## How to Use This

### Step 1: Re-run Nesting
1. Go to your browser (http://localhost:5180)
2. Upload your IFC file again
3. Run nesting with the same parameters
4. Wait for it to complete

### Step 2: Check the Backend Logs

After nesting completes, check the terminal/console where the backend is running. Look for:

#### Expected Debug Output:
```
[OPTIMIZATION DEBUG] Part 1 (c1030): start_slope=False (None°), end_slope=False (None°)
[OPTIMIZATION DEBUG] Part 2 (c1038): start_slope=False (None°), end_slope=False (None°)
[OPTIMIZATION DEBUG] Part 3 (c1033): start_slope=False (None°), end_slope=False (None°)
[OPTIMIZATION DEBUG] Part 4 (c1050): start_slope=False (None°), end_slope=True (42.0°)
[OPTIMIZATION DEBUG] Part 5 (c1041): start_slope=True (-42.0°), end_slope=False (None°)
```

This will tell us:
- ✅ Are the slopes being detected? (start_slope=True/False)
- ✅ What are the actual angle values?
- ✅ Are the angles similar in magnitude?
- ✅ Do they have opposite signs?

### Step 3: Diagnostic Scenarios

Based on the logs, we'll know what the issue is:

#### Scenario A: Slopes Not Detected
```
[OPTIMIZATION DEBUG] Part 4 (c1050): start_slope=False (None°), end_slope=False (None°)
[OPTIMIZATION DEBUG] Part 5 (c1041): start_slope=False (None°), end_slope=False (None°)
```
**Problem**: The slope detection isn't working for these parts
**Fix**: Need to check the IFC parsing and slope detection in cut_piece_extractor.py

#### Scenario B: Angles Are None
```
[OPTIMIZATION DEBUG] Part 4 (c1050): start_slope=True (None°), end_slope=True (None°)
```
**Problem**: Slopes are detected but angles aren't calculated
**Fix**: Need to fix angle calculation in the slope detection

#### Scenario C: Angles Don't Have Opposite Signs
```
[OPTIMIZATION DEBUG] Checking: c1050 (end=42.0°) vs c1041 (start=42.0°), diff=0.0°
[OPTIMIZATION DEBUG] Angles similar (diff=0.0°), opposite_signs=False
[OPTIMIZATION DEBUG] Skipped: angles not opposite signs
```
**Problem**: Both angles are positive (or both negative), so they can't nest
**Fix**: Need to re-examine what "complementary" means in this context

#### Scenario D: Angles Too Different
```
[OPTIMIZATION DEBUG] Checking: c1050 (end=42.0°) vs c1041 (start=38.0°), diff=4.0°
```
If diff > 5.0°, they won't be considered complementary
**Fix**: Might need to increase tolerance from 5° to 10°

#### Scenario E: Optimizer Working But No Improvement
```
[OPTIMIZATION] Potential complementary pair found! Testing arrangement...
[OPTIMIZATION DEBUG] After moving c1041 next to c1050: waste=495.0mm (original=492.0mm)
[OPTIMIZATION DEBUG] No improvement from this arrangement
```
**Problem**: Moving them adjacent actually makes it worse!
**Fix**: Need to check the waste calculation formula

## What To Share With Me

After you run the nesting, please share:

1. **The debug log lines** that start with `[OPTIMIZATION DEBUG]` for RHS120X120X5
2. **Specifically the lines** that show parts 4 and 5 (c1050 and c1041)
3. **Any lines** that mention "complementary pair"

Copy and paste those log lines and I'll diagnose the exact issue.

## Backend Status

- ✅ Backend restarted with debug logging
- ✅ Running on port 8000
- ✅ Process ID: 30120
- ✅ Frontend still on port 5180

## Next Steps After Diagnosis

Once we see the debug logs, I'll know exactly what to fix:
- If slopes aren't detected → Fix slope detection
- If angles are wrong → Fix angle calculation  
- If logic is wrong → Fix complementary detection logic
- If waste calc is wrong → Fix the waste formula

---

**Ready to test!** Please run nesting again and share the debug logs. 🔍

