# Nesting Min Angle Attribute Fix

## Issue
When attempting to generate nesting, the application threw an error:
```
AttributeError: 'NestingOrchestrator' object has no attribute 'min_angle'
```

## Root Cause
The `NestingOrchestrator` class was trying to use `self.min_angle` in the `nest_profile` method (line 124), but this attribute was never initialized in the `__init__` method.

## Fix Applied

### 1. Updated `NestingOrchestrator.__init__` method
**File**: `api/nesting/orchestrator.py`

Added `min_angle` parameter to the constructor:
```python
def __init__(
    self,
    stock_lengths: List[float],
    kerf: float = 3.0,
    trim: float = 5.0,
    angle_tolerance: float = 5.0,
    min_angle: float = 1.0,  # NEW PARAMETER
    log_func: Optional[Callable] = None
):
    # ... existing code ...
    self.min_angle = min_angle  # NEW ATTRIBUTE
```

### 2. Updated `create_nesting_report` function
**File**: `api/nesting/orchestrator.py`

Added `min_angle` parameter to the function signature and passed it to the orchestrator:
```python
def create_nesting_report(
    filename: str,
    ifc_file: any,
    selected_profiles: List[str],
    stock_lengths: List[float],
    kerf: float = 3.0,
    trim: float = 5.0,
    min_angle: float = 1.0,  # NEW PARAMETER
    extractor: Optional[any] = None,
    use_complementary_pairing: bool = True,
    log_func: Optional[Callable] = None
) -> NestingReport:
    orchestrator = NestingOrchestrator(
        stock_lengths=stock_lengths,
        kerf=kerf,
        trim=trim,
        min_angle=min_angle,  # PASSED TO ORCHESTRATOR
        log_func=log_func
    )
```

## What is `min_angle`?
The `min_angle` parameter defines the minimum angle (in degrees) to consider as a slope when detecting complementary pairs for nesting optimization. 

- **Default value**: 1.0°
- **Purpose**: Parts with slopes below this threshold are not considered for complementary pairing
- **Used by**: `find_complementary_pairs` function in `pair_detector.py`

## Testing
After applying the fix:
1. ✅ Backend server restarted successfully
2. ✅ No import errors
3. ✅ Server running on http://0.0.0.0:8000
4. ✅ Ready to test nesting functionality

## Status
**FIXED** - The nesting feature should now work correctly. The backend has been restarted with the updated code.

## Date
2026-02-18


