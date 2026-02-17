# Complementary Pairing Issue - Analysis & Fix

## Issue Description

User reported that parts with **different slope angles** are being incorrectly paired as "complementary" in the nesting visualization. Looking at the cutting pattern visualization, parts in positions 1 and 3 have visibly different slope angles but are being treated as if they can share a cut.

## Root Cause Analysis

### 1. **Angle Matching Logic** (`pair_detector.py`, line 75)

```python
def check_slope_match(angle1, angle2, angle_tolerance=5.0, min_angle=1.0):
    angle_diff = abs(abs(angle1) - abs(angle2))
    return angle_diff < angle_tolerance and abs(angle1) > min_angle
```

**Problem:** This logic compares the **absolute values** of angles, which means:
- It only checks if magnitudes are similar
- It doesn't verify if the angles are truly complementary (matching for a shared cut)
- A 30° cut and a 45° cut would have a difference of 15°, which might pass if tolerance is high

### 2. **Tolerance Value** (`slope_detector.py`, line 23)

```python
COMPLEMENTARY_ANGLE_TOLERANCE = 5.0  # Maximum angle difference for complementary match
```

**Current value:** 5.0° tolerance

**Issue:** While 5° seems reasonable, the fundamental problem is the matching logic itself, not just the tolerance.

### 3. **What "Complementary" Should Mean**

For two parts to share a cut (be complementary), their slope angles must be:
1. **Nearly identical** (within a tight tolerance, e.g., ±2°)
2. **Both measured from the same reference** (same angle convention)
3. **Facing the correct direction** (one part's end matches the other's start)

The current logic checks #3 (pairing type) but is too lenient on #1.

## Proposed Fix

### Option 1: Tighten the Tolerance (Quick Fix)

Reduce `COMPLEMENTARY_ANGLE_TOLERANCE` from 5.0° to 2.0°:

```python
COMPLEMENTARY_ANGLE_TOLERANCE = 2.0  # Maximum angle difference for complementary match
```

**Pros:**
- Simple one-line change
- Will reduce false positives

**Cons:**
- Might miss some valid pairs if slope detection has measurement noise
- Doesn't address the fundamental logic issue

### Option 2: Improve Angle Matching Logic (Better Fix)

Add additional validation in `check_slope_match`:

```python
def check_slope_match(
    angle1: Optional[float],
    angle2: Optional[float],
    angle_tolerance: float = 2.0,  # Reduced from 5.0
    min_angle: float = 1.0,
    require_same_convention: bool = True
) -> bool:
    """
    Check if two angles match (are complementary).
    
    Two angles are complementary if:
    1. Both are above minimum threshold
    2. Their absolute difference is within tolerance
    3. (Optional) They use the same angle convention
    """
    if angle1 is None or angle2 is None:
        return False
    
    # Both must be significant slopes
    if abs(angle1) < min_angle or abs(angle2) < min_angle:
        return False
    
    # Calculate angle difference
    angle_diff = abs(abs(angle1) - abs(angle2))
    
    if angle_diff >= angle_tolerance:
        return False
    
    # Optional: Check if both use same convention
    if require_same_convention:
        from .slope_detector import detect_angle_convention
        conv1, _ = detect_angle_convention(angle1)
        conv2, _ = detect_angle_convention(angle2)
        if conv1 != conv2:
            return False
    
    return True
```

**Pros:**
- More robust validation
- Prevents cross-convention matching
- Tighter tolerance reduces false positives

**Cons:**
- More complex logic
- Requires testing to ensure it doesn't break valid cases

### Option 3: Add Confidence Weighting (Advanced Fix)

Consider the confidence scores when matching:

```python
def check_slope_match_with_confidence(
    slope1: SlopeInfo,
    slope2: SlopeInfo,
    angle_tolerance: float = 3.0,
    min_angle: float = 1.0,
    min_confidence: float = 0.3
) -> bool:
    """
    Check if two slopes match, considering confidence scores.
    
    Higher confidence slopes require tighter angle matching.
    Lower confidence slopes get more lenient matching.
    """
    if not slope1.has_slope or not slope2.has_slope:
        return False
    
    if slope1.angle is None or slope2.angle is None:
        return False
    
    # Both must meet minimum requirements
    if abs(slope1.angle) < min_angle or abs(slope2.angle) < min_angle:
        return False
    
    if slope1.confidence < min_confidence or slope2.confidence < min_confidence:
        return False
    
    # Calculate angle difference
    angle_diff = abs(abs(slope1.angle) - abs(slope2.angle))
    
    # Adjust tolerance based on confidence
    # High confidence (>0.8) -> use strict tolerance (e.g., 2°)
    # Low confidence (<0.5) -> use lenient tolerance (e.g., 5°)
    avg_confidence = (slope1.confidence + slope2.confidence) / 2.0
    adjusted_tolerance = angle_tolerance * (1.5 - avg_confidence)
    
    return angle_diff < adjusted_tolerance
```

**Pros:**
- Adapts to measurement quality
- More intelligent matching
- Reduces false positives while preserving true positives

**Cons:**
- Most complex solution
- Requires careful tuning
- Might be overkill for the problem

## Recommended Action

**Immediate Fix:** Option 1 (reduce tolerance to 2.0°)

**Long-term Fix:** Option 2 (improve matching logic with convention checking)

## Testing Plan

1. **Add logging** (already done) to see actual angle values being compared
2. **Run nesting** on the user's IFC file to see what angles are being matched
3. **Adjust tolerance** based on real-world data
4. **Verify** that valid complementary pairs are still detected
5. **Confirm** that invalid pairs (like the user's example) are rejected

## Files to Modify

1. `api/nesting/slope_detector.py` - Adjust `COMPLEMENTARY_ANGLE_TOLERANCE`
2. `api/nesting/pair_detector.py` - Improve `check_slope_match` logic
3. `api/nesting/models.py` - Update `SlopeInfo.is_complementary_to` if needed

## Next Steps

1. ✅ **Added detailed logging** to see what's being matched
2. ⏳ **Wait for user to run nesting** and share console output
3. ⏳ **Analyze actual angle values** from the log
4. ⏳ **Implement appropriate fix** based on data
5. ⏳ **Test and verify** the fix works

---

**Status:** Logging added, waiting for user feedback with actual angle data.

**Date:** 2026-02-17

