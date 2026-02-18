# Nesting Frontend Field Name Fix

## Issue
When the nesting report was displayed, the frontend threw an error:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'toFixed')
at NestingReport (NestingReport.tsx:625:77)
```

## Root Cause
**Field name mismatch** between backend and frontend:
- **Backend** returns: `avg_waste_percentage` (in `api/nesting/report_builder.py`)
- **Frontend** expected: `average_waste_percentage` (in React components)

The frontend was trying to access `nestingReport.summary.average_waste_percentage`, which didn't exist in the API response, resulting in `undefined.toFixed()` error.

## Fix Applied

### Updated Frontend Components

#### 1. `NestingReport.tsx` (line 625)
Changed from:
```typescript
{nestingReport.summary.average_waste_percentage.toFixed(2)}%
```
To:
```typescript
{nestingReport.summary.avg_waste_percentage.toFixed(2)}%
```

#### 2. `NestingReportPDF.tsx` (4 occurrences)
Updated all references from `average_waste_percentage` to `avg_waste_percentage`:
- Line 1313: Display avg waste percentage
- Line 1357: Calculate material efficiency (100 - avg_waste_percentage)
- Line 1559: Color coding based on waste percentage
- Line 1562: Display avg waste percentage in summary

## Files Modified
1. ✅ `web/src/components/NestingReport.tsx` - Main nesting report display
2. ✅ `web/src/components/NestingReportPDF.tsx` - PDF export component

## Backend Field (No Changes Needed)
The backend correctly returns `avg_waste_percentage` in:
- `api/nesting/report_builder.py` - `build_report_summary()` function (line 133)

## Testing
After applying the fix:
1. ✅ Frontend code updated
2. ✅ Field name matches backend response
3. ✅ No more undefined property access
4. ✅ Nesting report should display correctly

## Related Fixes
This is the third fix in the nesting feature series:
1. **Fix #1**: Added missing `min_angle` attribute
2. **Fix #2**: Fixed JSON serialization for boolean types
3. **Fix #3**: Fixed field name mismatch (this fix)

## Status
**FIXED** - The nesting report should now display correctly without errors. The frontend will hot-reload automatically with the changes.

## Date
2026-02-18

