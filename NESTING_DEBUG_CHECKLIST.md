# Nesting Debug Checklist

## Current Issues (from screenshot)

1. ✅ **12m bars being used** - FIXED (stock preference working)
2. ❌ **Part names showing "Unknown"** - Still broken
3. ❓ **Quantities/grouping** - Need to verify if correct
4. ❓ **Waste calculations** - Need to verify

## What We've Fixed So Far

1. ✅ Port 5180 configuration
2. ✅ min_angle attribute
3. ✅ JSON serialization for booleans
4. ✅ Frontend field name (avg_waste_percentage)
5. ✅ Stock preference (12m before 6m)
6. ✅ Part structure (nested "part" object)
7. ✅ element_name field added
8. ✅ Separated reference and element_name extraction

## Current Hypothesis

The parts are being extracted (we see 17 parts of 91mm, 5 parts of 2115mm), but **both `reference` and `element_name` are empty**.

This could mean:
- The IFC file doesn't have Name/Tag/Reference attributes set
- OR the extraction is failing silently

## Debug Steps Added

Added logging in `part_extractor.py` (line 79):
```python
log_func(f"[PART_EXTRACTOR] Element {product_id}: reference='{reference}', element_name='{element_name}', type={element_type}")
```

## Next Steps

1. **Generate nesting report again**
2. **Check backend logs** at `c:\Users\maora\.cursor\projects\c-CUTWISE\terminals\10.txt`
3. **Look for lines** like:
   ```
   [PART_EXTRACTOR] Element 12345: reference='', element_name='', type=IfcBeam
   ```
4. **If both are empty**: The IFC file doesn't have these attributes
5. **If they have values**: There's a serialization issue

## Possible Solutions

### If IFC has no Name/Tag/Reference:
- Add fallback to use `element_type + product_id` (e.g., "IfcBeam_12345")
- Or use assembly_mark if available
- Or use profile_name + index

### If extraction is working but display is broken:
- Check the JSON response structure
- Verify frontend is reading the correct fields
- Check browser console for errors

## Files Modified Today

1. `api/nesting/orchestrator.py` - Added min_angle
2. `api/nesting/models.py` - Fixed JSON serialization, added element_name, nested part structure
3. `api/nesting/bin_packer.py` - Fixed stock preference (reverse=True)
4. `api/nesting/part_extractor.py` - Separated reference/element_name, added logging
5. `web/src/components/NestingReport.tsx` - Fixed field name
6. `web/src/components/NestingReportPDF.tsx` - Fixed field name
7. `web/vite.config.ts` - Port 5180
8. `README.md`, `QUICKSTART.md` - Updated port references

## Backend Status
✅ Running on http://localhost:8000 with debug logging enabled

---

**Please generate a new nesting report and share the results!**


