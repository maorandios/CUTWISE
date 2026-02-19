# Nesting Reference and Element Name Separation Fix

## Date
2026-02-18

## Issue
Part names were still showing as "Unknown" even after previous fixes because `reference` and `element_name` were not properly separated like in the old API.

## Root Cause
The `extract_reference()` function was falling back to the **Name** attribute if Tag/Reference were not found. This meant:
- `reference` would contain the Name value
- `element_name` would also contain the Name value
- They were duplicates instead of being separate fields

**Old API Behavior** (from `main.py.backup` lines 2248-2264):
```python
element_name = getattr(element, 'Name', None) or ''
reference = # Tag or Reference property (could be None/empty)

part_data = {
    "element_name": element_name,  # Always from Name attribute
    "reference": reference,         # From Tag/Reference (separate!)
    ...
}
```

**Problem in Refactored Code**:
The `extract_reference()` function (line 308-312) was doing:
```python
# Try Name attribute as fallback
if hasattr(element, 'Name') and element.Name:
    name = str(element.Name).strip()
    if name and name.upper() not in ['NONE', 'NULL', 'N/A', '']:
        return name  # ← This made reference = Name!
```

This caused `reference` to always have a value (the Name), so the frontend never fell back to `element_name`.

## Fixes Applied

### 1. Remove Name fallback from extract_reference()
**File**: `api/nesting/part_extractor.py` (line 277-314)

**Before:**
```python
def extract_reference(element: Any) -> Optional[str]:
    # Try Reference property
    # Try Tag attribute
    # Try Name attribute  ← REMOVED THIS
    if hasattr(element, 'Name') and element.Name:
        return name
    return None
```

**After:**
```python
def extract_reference(element: Any) -> Optional[str]:
    # Try Reference property
    # Try Tag attribute
    # Don't fall back to Name - that's handled separately as element_name
    return None  # ← Returns None if no Tag/Reference found
```

### 2. Keep reference empty if not found
**File**: `api/nesting/part_extractor.py` (line 81)

**Before:**
```python
reference=reference or f"{element_type}_{product_id}",  # Fallback
```

**After:**
```python
reference=reference or '',  # Keep empty if not found (don't use fallback)
```

## How It Works Now

The extraction now properly separates the two fields:

1. **`reference`** = Tag or Reference property (can be empty/None)
2. **`element_name`** = Name attribute (always extracted)

Frontend fallback chain:
```typescript
const reference = partData.reference || null       // Tag/Reference
const elementName = partData.element_name || null  // Name
const partName = reference || elementName || 'Unknown'
```

## Example Scenarios

### Scenario 1: Element has Tag
- IFC: `Tag = "B27"`, `Name = "Steel Beam"`
- Result: `reference = "B27"`, `element_name = "Steel Beam"`
- Display: **"B27"** (uses reference)

### Scenario 2: Element has only Name
- IFC: `Tag = null`, `Name = "Steel Beam"`
- Result: `reference = ""`, `element_name = "Steel Beam"`
- Display: **"Steel Beam"** (falls back to element_name)

### Scenario 3: Element has Reference property
- IFC: `Reference = "COL-1"`, `Name = "Column"`
- Result: `reference = "COL-1"`, `element_name = "Column"`
- Display: **"COL-1"** (uses reference)

## Backend Status
✅ Backend restarted with fix on http://localhost:8000

## Testing
Generate a new nesting report and verify:
1. ✅ Parts with Tag/Reference show that value
2. ✅ Parts without Tag/Reference show Name
3. ✅ No more "Unknown" for parts that have Name
4. ✅ All part metadata displays correctly

---

**The nesting report should now show proper part names matching the old API behavior!** 🎯


