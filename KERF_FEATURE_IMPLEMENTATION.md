# Kerf Feature Implementation

## Date: February 16, 2026

## Problem
The kerf (cutting blade width) was hardcoded to 3mm and users couldn't configure it. Additionally, kerf was only applied when boundaries couldn't be shared, not consistently between all cuts.

## Solution Implemented

### 1. Frontend Changes (`web/src/components/NestingReport.tsx`)

**Added kerf state:**
```typescript
const [kerfValue, setKerfValue] = useState<number>(3.0) // Default kerf: 3mm
```

**Added kerf input UI:**
- New "Cutting Configuration" section in profile selection step
- Input field for kerf value (0-10mm range, 0.1mm step)
- Default value: 3.0mm
- Helpful description text

**Updated API call:**
```typescript
const params = new URLSearchParams({
  stock_lengths: stockLengths,
  profiles: Array.from(selectedProfiles).join(','),
  kerf: kerfValue.toString()  // Pass kerf value to backend
})
```

### 2. Backend Changes (`api/main.py`)

**Updated API endpoint signature:**
```python
@app.get("/api/nesting/{filename}")
async def generate_nesting(filename: str, stock_lengths: str, profiles: str, kerf: float = 3.0):
```

**Added kerf logging:**
```python
nesting_log(f"[NESTING] Kerf: {kerf}mm", flush=True)
```

**Updated kerf application:**
```python
# Changed from hardcoded:
kerf_mm = 3.0  # Standard kerf for steel cutting

# To user-provided:
kerf_mm = kerf  # Use user-provided kerf value
```

## How It Works

1. **User Input:** User selects kerf value in UI (default: 3mm)
2. **API Call:** Frontend passes kerf parameter to backend
3. **Kerf Application:** Backend applies kerf between parts when boundaries can't be shared
4. **Waste Calculation:** Kerf is included in total length calculation

## When Kerf is Applied

Kerf is added between parts when:
- Previous part's end cut and current part's start cut **cannot share a boundary**
- This happens when:
  - Both cuts are straight (0°) → Can share, no kerf
  - Both cuts are sloped with matching angles → Can share, no kerf  
  - One is straight, one is sloped → Cannot share, add kerf
  - Both are sloped but angles don't match → Cannot share, add kerf

## Testing

To test the kerf feature:

1. Open http://localhost:5180
2. Upload an IFC file
3. Go to Nesting tab
4. Select profiles
5. **Set kerf value** (try 0mm, 3mm, 5mm)
6. Generate nesting
7. Check the cutting list and waste calculations

### Expected Results:

**With kerf = 0mm:**
- Parts placed tightly together
- Lower waste (but unrealistic for actual cutting)

**With kerf = 3mm (default):**
- 3mm gap between incompatible cuts
- Realistic waste for steel cutting

**With kerf = 5mm:**
- 5mm gap between incompatible cuts
- Higher waste (for thicker cutting blades)

## Benefits

✅ User can configure kerf based on their cutting equipment
✅ More accurate waste calculations
✅ Better material planning
✅ Flexible for different materials and cutting methods

## Notes

- Kerf is only applied when boundaries cannot be shared
- Complementary slopes can share boundaries (no kerf needed)
- Straight-to-straight cuts can share boundaries (no kerf needed)
- Default value (3mm) is standard for steel plasma/laser cutting
