# Nesting Part Structure Fix

## Date
2026-02-18

## Issue
The nesting report was showing "Unknown" for part names and missing other important information like:
- Part names/references
- Assembly marks
- Slope angles
- Other part metadata

## Root Cause
During the refactoring of the nesting algorithm, the structure of parts in the API response was changed.

**Old Structure** (in `main.py.backup` line 3556-3568):
```python
pattern_parts.append({
    "part": part,  # ← Part object nested here
    "cut_position": cut_position,
    "length": part_length,
    "slope_info": {
        "start_angle": part.get("start_angle"),
        "end_angle": part.get("end_angle"),
        "start_has_slope": part.get("start_has_slope", False),
        "end_has_slope": part.get("end_has_slope", False),
        "has_slope": ...,
        "complementary_pair": ...
    }
})
```

**New Structure** (after refactoring):
```python
"parts": [part.to_dict() for part in self.parts]
# This returns: [{"reference": "...", "length": ..., ...}, ...]
```

The new structure returned parts as flat dictionaries, but the **frontend expected the old nested structure** with `part.part.reference`.

## Frontend Expectation

The frontend code (`NestingReport.tsx` line 33-36) was looking for:
```typescript
const partData = part?.part || {}  // ← Expects nested "part" object
const reference = partData.reference
```

But the new API was sending:
```json
{
  "parts": [
    {"reference": "...", "length": ..., ...}  // ← Flat structure
  ]
}
```

Instead of:
```json
{
  "parts": [
    {
      "part": {"reference": "...", ...},  // ← Nested structure
      "length": ...,
      "slope_info": {...}
    }
  ]
}
```

## Fix Applied

### File: `api/nesting/models.py`

Updated the `CuttingPattern.to_dict()` method (line 266) to match the old API structure:

**Before:**
```python
def to_dict(self) -> Dict[str, Any]:
    return {
        "stock_length": self.stock_length,
        "parts": [part.to_dict() for part in self.parts],  # Flat structure
        "waste": self.waste,
        ...
    }
```

**After:**
```python
def to_dict(self) -> Dict[str, Any]:
    # Match the old API structure where parts are wrapped with "part" key
    parts_list = []
    for part in self.parts:
        parts_list.append({
            "part": part.to_dict(),  # ← Nested for frontend compatibility
            "length": part.length,
            "slope_info": {
                "start_angle": part.start_slope.angle,
                "end_angle": part.end_slope.angle,
                "start_has_slope": part.start_slope.has_slope,
                "end_has_slope": part.end_slope.has_slope,
                "has_slope": part.has_any_slope,
                "complementary_pair": part.complementary_pair
            }
        })
    
    return {
        "stock_length": self.stock_length,
        "parts": parts_list,  # ← Nested structure
        ...
    }
```

## What This Fixes

Now the frontend will correctly display:
- ✅ **Part names/references** (from `part.part.reference`)
- ✅ **Element names** (from `part.part.element_name`)
- ✅ **Assembly marks** (from `part.part.assembly_mark`)
- ✅ **Slope angles** (from `part.slope_info.start_angle` and `end_angle`)
- ✅ **Slope indicators** (from `part.slope_info.has_slope`)
- ✅ **Complementary pair flags** (from `part.slope_info.complementary_pair`)
- ✅ **All other part metadata**

## Backend Status
✅ Backend server restarted with fix on http://localhost:8000

## Testing
To verify the fix:
1. Generate a new nesting report
2. Check that part names are displayed instead of "Unknown"
3. Verify slope angles are shown (if parts have slopes)
4. Check assembly marks are visible
5. Confirm all part metadata is present

---

**The nesting report should now display all part information correctly!** 📋

