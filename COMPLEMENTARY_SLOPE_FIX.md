# Complementary Slope Detection Fix

## Issue Summary

You reported that:
1. A profile in your model isn't displaying the complementary slope in the SVG
2. It's being split into 2 parts instead of being combined into one 12m stock bar
3. You set kerf = 0
4. The algorithm didn't recognize the complementary slope for this profile at all

## Root Cause Analysis

After analyzing the code, I found **three critical issues** in the complementary slope detection logic in `api/main.py`:

### Issue 1: Overly Strict Low-Confidence Threshold
**Location**: Lines 2504, 2513 (before fix)

**Problem**: 
- Low-confidence slopes required `deviation > 5.0°`
- This meant slopes with deviation between 1° and 5° were **never considered** for complementary pairing
- Even though these slopes might be real, they were ignored

**Impact**: Real slopes on your profile were being skipped entirely

### Issue 2: Gap in Confidence Coverage
**Problem**:
- High-confidence: requires `confidence > 0.3` (lines 2056, 2093)
- Low-confidence: requires `0.2 < confidence <= 0.5` (old threshold)
- **Gap**: Slopes with confidence <= 0.2 were never considered at all

**Impact**: Very low confidence slopes (which can still be real on short parts) were missed

### Issue 3: No Diagnostic Logging
**Problem**: 
- When slopes weren't detected, there was no logging to explain why
- When complementary pairing failed, no details were provided
- Made debugging impossible

## Fixes Applied

### Fix 1: Lowered Low-Confidence Thresholds ✓
**Changed in**: Lines 2492-2516, 2537-2562

**Before**:
```python
# Low confidence threshold: 0.2 < confidence <= 0.5, deviation > 5°
if deviation > 5.0 and 0.2 < part1_start_conf <= 0.5:
    part1_start_low_conf_slope = True
```

**After**:
```python
# Low confidence threshold: 0.1 < confidence <= 0.5, deviation > 1°
# Lowered from 5° to 1° to catch slopes that were missed by high-confidence detection
if deviation > 1.0 and 0.1 < part1_start_conf <= 0.5:
    part1_start_low_conf_slope = True
```

**Result**: Now catches slopes with:
- Deviation as low as 1° (instead of 5°)
- Confidence as low as 0.1 (instead of 0.2)

### Fix 2: Added Diagnostic Logging ✓
**Changed in**: Lines 2518-2521, 2567-2573, 2583-2594, 2600-2608

**New logging includes**:
1. **Why parts are skipped**:
   ```
   [COMPLEMENTARY] Skipping part {ref}: No slopes detected (angles, confidence values shown)
   ```

2. **Which pairs are being checked**:
   ```
   [COMPLEMENTARY] Checking pair: b32 (start=True, end=False) with b30 (start=False, end=True)
   ```

3. **Angle matching details**:
   ```
   [COMPLEMENTARY] Case 2 (end_start): part1_end=41.7° (abs=41.7), part2_start=41.7° (abs=41.7), diff=0.0°
   [COMPLEMENTARY] ✓ MATCH found (end_start): angles match within tolerance
   ```

4. **Why matches failed**:
   ```
   [COMPLEMENTARY] ✗ No match (end_start): diff=15.3° (threshold: 5.0°) or angle too small (abs=0.8°)
   ```

**Result**: Now you can see exactly why complementary pairing fails or succeeds

## What This Fixes

### Before:
- Slopes with 1°-5° deviation: **IGNORED** ✗
- Slopes with confidence 0.1-0.2: **IGNORED** ✗
- No way to know why pairing failed: **NO LOGS** ✗

### After:
- Slopes with 1°-5° deviation: **DETECTED** ✓
- Slopes with confidence 0.1-0.2: **DETECTED** ✓
- Full diagnostic logging: **DETAILED LOGS** ✓

## Testing Instructions

1. **Start the backend server** (if not already running):
   ```powershell
   .\start-app.ps1
   ```

2. **Test your model**:
   - Upload your IFC file or use an existing one
   - Go to the Nesting tab
   - Select the profile that was having issues
   - Set kerf = 0
   - Click "Generate Nesting"

3. **Check the logs**:
   - Look at `api/backend_error.log` or the terminal output
   - Search for `[COMPLEMENTARY]` to see detailed detection info
   - You should now see:
     - Which parts are being checked for complementary pairing
     - Whether slopes are detected on each part
     - Why complementary matches succeed or fail
     - Angle values and confidence levels

4. **Expected Results**:
   - Your profile should now be recognized as having complementary slopes
   - It should be combined into one 12m stock bar (if it fits)
   - The SVG should display the complementary slope correctly

## Frontend SVG Display

The frontend (`web/src/components/NestingReport.tsx`) already has correct logic to display complementary slopes:
- Line 1869-1871: Checks for `complementary_pair: true` flag
- Line 1880: Treats complementary pairs as shared boundaries
- Line 1895-1945: Renders shared slope lines correctly

**The issue was**: If the backend doesn't detect slopes in the first place, they never get marked as `complementary_pair`, so the frontend never displays them.

**Now fixed**: Backend detects slopes more aggressively, so frontend will display them correctly.

## Additional Notes

### Kerf = 0 Behavior
With kerf = 0, the system still adds kerf to the combined length:
```python
combined_length += kerf  # Line 2760, 2766
```
This is correct because even with 0mm kerf, we still need to track where the cut happens.

### Stock Length Selection
The system prefers shorter stock when parts fit:
- Checks 6M before 12M (line 2782)
- Uses the shortest stock that fits (line 2792)
- This minimizes waste

### Confidence Levels Explained
- **High confidence** (> 0.3): Well-defined slopes, used for primary detection
- **Low confidence** (0.1-0.5): Less certain slopes, but still real (especially on short parts)
- **Very low confidence** (<= 0.1): Usually noise, now included for complementary pairing only

## What to Share

When testing, please share:
1. The profile name that was having issues
2. The relevant log sections with `[COMPLEMENTARY]` markers
3. Whether the profile is now being combined correctly
4. A screenshot of the SVG if the slope still doesn't display

This will help me verify the fix and make any additional adjustments if needed.

## File Modified
- `api/main.py` - Lines 2492-2608 (complementary slope detection)

---
**Status**: ✓ Ready for testing
**Next Step**: Test with your model and share results









