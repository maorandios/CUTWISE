# Nesting Stock Tolerance Feature

## Date
2026-02-20 (Updated: User-Configurable)

## Background
Stock bars in real-world scenarios never come with precise dimensions like 6000mm or 12000mm. They always have a safety tolerance of 10-50mm exceeding the formal length to account for manufacturing variations and handling.

**Example:**
- A "6000mm" stock bar is actually 6010-6050mm
- A "12000mm" stock bar is actually 12010-12050mm

The nesting algorithm was not accounting for this tolerance, which meant that cuts close to the nominal stock length were being rejected even though they would fit in the actual physical stock.

## Update: User-Configurable Tolerance
The tolerance feature is now **user-configurable** with enable/disable toggle and custom value input.

## Problem Example

**Before Fix:**
- User has a 6000mm cut
- With 3mm kerf: 6000 + 3 = 6003mm needed
- Stock: 6000mm nominal - 5mm trim = 5995mm usable
- **Result:** ❌ Doesn't fit (6003 > 5995)
- The algorithm would require a 12000mm stock bar for this single cut, wasting ~6000mm

## Solution

Added a **20mm safety tolerance** to all stock lengths in the nesting calculations. This represents the average excess length found in real-world stock bars.

### Implementation

**File:** `api/nesting/orchestrator.py`

1. **Added constant** (line 37):
   ```python
   STOCK_SAFETY_TOLERANCE_MM = 20.0
   ```

2. **Updated stock length calculation** (line 76):
   ```python
   # Before:
   self.stock_lengths = sorted([length - trim for length in stock_lengths])
   
   # After:
   self.stock_lengths = sorted([length - trim + STOCK_SAFETY_TOLERANCE_MM for length in stock_lengths])
   ```

3. **Updated usable length mapping** (line 80):
   ```python
   self.usable_to_original_map = {
       (length - trim + STOCK_SAFETY_TOLERANCE_MM): length 
       for length in stock_lengths
   }
   ```

4. **Updated stock optimization** (line 204):
   ```python
   usable_stock_lengths = [length - self.trim + STOCK_SAFETY_TOLERANCE_MM for length in self.original_stock_lengths]
   ```

5. **Added user notification** (line 273):
   ```python
   self.log_func(f"[ORCHESTRATOR] Stock safety tolerance: +{STOCK_SAFETY_TOLERANCE_MM}mm (stock bars have 10-50mm excess)")
   ```

## Result

**After Fix:**
- User has a 6000mm cut
- With 3mm kerf: 6000 + 3 = 6003mm needed
- Stock: 6000mm nominal + 20mm tolerance - 5mm trim = 6015mm usable
- **Result:** ✅ Fits! (6003 < 6015)

### Calculation Formula

```
Usable Stock Length = Nominal Length - Trim + Safety Tolerance
                    = 6000mm - 5mm + 20mm
                    = 6015mm
```

## Benefits

1. ✅ **More realistic calculations** - Accounts for real-world stock bar dimensions
2. ✅ **Better stock utilization** - Cuts close to nominal length now fit properly
3. ✅ **Reduced waste** - Fewer cases where a larger stock is needed unnecessarily
4. ✅ **Transparent to users** - Users still see nominal lengths (6000mm, 12000mm) in reports
5. ✅ **User notification** - Logs inform users that 20mm tolerance is applied

## User-Facing Behavior

### Frontend UI Controls
Users can now control the stock tolerance feature from the Nesting Report interface:

1. **Enable/Disable Toggle**: Checkbox to turn tolerance on or off
2. **Custom Value Input**: When enabled, users can set any tolerance value (0-100mm)
3. **Default Settings**: 
   - Enabled by default
   - Default value: 20mm (average of 10-50mm range)
4. **Real-time Feedback**: UI shows calculated usable length based on current settings

### Calculation Display
- **Reports display:** Nominal stock lengths (6000mm, 12000mm)
- **Calculations use:** Actual usable lengths based on user settings
  - If enabled (20mm): 6015mm usable (6000 - 5 trim + 20 tolerance)
  - If disabled (0mm): 5995mm usable (6000 - 5 trim + 0 tolerance)
- **Logs show:** Clear message about tolerance status (enabled/disabled)

## Example Log Output

### With Tolerance Enabled (20mm)
```
[NESTING] Stock tolerance: 20.0mm (enabled)
[ORCHESTRATOR] Stock lengths (nominal): [6000.0, 12000.0]
[ORCHESTRATOR] Stock lengths (usable after trim + tolerance): [6015.0, 12015.0]
[ORCHESTRATOR] Kerf: 3.0mm
[ORCHESTRATOR] Trim: 5.0mm
[ORCHESTRATOR] Stock safety tolerance: +20.0mm (enabled)
```

### With Tolerance Disabled (0mm)
```
[NESTING] Stock tolerance: 0.0mm (disabled)
[ORCHESTRATOR] Stock lengths (nominal): [6000.0, 12000.0]
[ORCHESTRATOR] Stock lengths (usable after trim + tolerance): [5995.0, 11995.0]
[ORCHESTRATOR] Kerf: 3.0mm
[ORCHESTRATOR] Trim: 5.0mm
[ORCHESTRATOR] Stock safety tolerance: disabled (0mm)
```

## Testing Recommendations

Test with cuts that are close to nominal stock length:
- 5997mm cut → Should fit in 6000mm stock (5997 + 3 kerf = 6000mm < 6015mm usable)
- 6010mm cut → Should fit in 6000mm stock (6010 + 3 kerf = 6013mm < 6015mm usable)
- 6013mm cut → Should fit in 6000mm stock (6013 + 3 kerf = 6016mm > 6015mm usable) - edge case
- 11997mm cut → Should fit in 12000mm stock

## API Changes

### Backend (`api/main.py`)
- Added `stock_tolerance` parameter to `/api/nesting/{filename}` endpoint
- Default value: `0.0` (disabled)
- Range: 0-100mm

### Orchestrator (`api/nesting/orchestrator.py`)
- Added `stock_tolerance` parameter to `__init__` and `create_nesting_report`
- Replaces hardcoded `STOCK_SAFETY_TOLERANCE_MM` constant with user-provided value
- Logs show tolerance status (enabled/disabled)

### Frontend (`web/src/components/NestingReport.tsx`)
- Added `stockToleranceEnabled` state (default: `true`)
- Added `stockToleranceValue` state (default: `20.0`)
- Added UI controls: checkbox toggle + number input
- Sends `stock_tolerance` parameter to API (0 if disabled, value if enabled)

## Notes

- Default tolerance is 20mm (average of 10-50mm range)
- Users can disable tolerance for exact nominal length calculations
- Users can customize tolerance value (0-100mm)
- Users are informed via logs and UI about tolerance status
- The tolerance does NOT appear in user-facing reports (only nominal lengths shown)
- This matches real-world manufacturing and handling practices

