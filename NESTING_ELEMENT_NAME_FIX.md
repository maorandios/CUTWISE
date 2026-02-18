# Nesting Element Name Fix

## Date
2026-02-18

## Issue
Even after fixing the part structure, the nesting report was still showing "Unknown" for part names because the `element_name` field was missing from the API response.

## Root Cause
The frontend code looks for BOTH fields when displaying part names:
```typescript
const reference = partData.reference || null
const elementName = partData.element_name || null  // ← This was missing!
const partName = reference || elementName || 'Unknown'
```

The refactored code was only sending `reference` but not `element_name`, which the old API included.

## Old API Behavior
In `main.py.backup`, the old API extracted and sent `element_name`:
```python
element_name = getattr(element, 'Name', None) or ''
# ... later sent in response as part of the part dictionary
```

## Fixes Applied

### 1. Extract element_name during part extraction
**File**: `api/nesting/part_extractor.py` (line 72)

Added extraction of element Name attribute:
```python
# Extract element name for frontend compatibility
element_name = getattr(element, 'Name', None) or ''

# Store in original_data
original_data={
    "ifc_id": product_id,
    "ifc_type": element_type,
    "element_name": element_name  # ← Added
}
```

### 2. Include element_name in Part.to_dict()
**File**: `api/nesting/models.py` (line 186)

Added `element_name` to the dictionary output:
```python
return {
    "product_id": self.product_id,
    "length": self.length,
    "profile_name": self.profile_name,
    "element_type": self.element_type,
    "reference": self.reference,
    "element_name": self.original_data.get("element_name", ""),  # ← Added
    "assembly_mark": self.assembly_mark,
    ...
}
```

## Frontend Fallback Logic
The frontend now has three levels of fallback for displaying part names:
1. **First**: Try `reference` (from Tag or Reference property)
2. **Second**: Try `element_name` (from Name attribute)
3. **Third**: Show "Unknown"

## What This Fixes
✅ Part names will now display correctly  
✅ Falls back to element Name if Reference/Tag is not set  
✅ Maintains compatibility with old API structure  
✅ All part metadata is preserved  

## Backend Status
✅ Backend restarted with fix on http://localhost:8000

## Testing
Generate a new nesting report and verify:
1. Part names display (not "Unknown")
2. If IFC elements have Tag/Reference → shows that
3. If IFC elements only have Name → shows that
4. All other part data is visible

---

**The nesting report should now show proper part names!** 🏷️

